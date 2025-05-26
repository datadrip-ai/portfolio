/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Video gallery page component for displaying and interacting with videos.
 * Fetches videos from /api/videos and tags from /thumbnails/tags.csv.
 * Supports lazy loading, filtering, sorting (date/name), swipe gestures, and dynamic sizing.
 * Renders client-side WebM video previews on hover with duration and tags bubbles.
 * Uses globals.css for styling via CSS variables.
 *
 * @module app/page
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import Image from "next/image";
import { debounce } from "lodash";
import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import "@/globals.css";
import Nav from "@/components/ui/nav";

interface Video {
  id: string;
  name: string;
  path: string;
  url: string;
  fileType: string;
  thumbnail: string; // Always an image (e.g., .jpg)
  preview: string; // Always a video (e.g., .webm)
  duration?: number;
  createdAt?: string;
}

interface Tag {
  videoId: string;
  tags: string[];
}

const FALLBACK_IMAGE = {
  src: "/thumbnails/preview/default.jpg",
  width: 200,
  height: 150,
};

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [filter, setFilter] = useState<"all" | "mp4" | "webm">("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [cardWidth, setCardWidth] = useState(FALLBACK_IMAGE.width);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const gridItemRef = useRef<HTMLDivElement | null>(null);
  const [loopVideo, setLoopVideo] = useState(false);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const videoTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Fetch video data
  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/videos", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      if (data.error) {
        logger.error("\x1b[31mAPI error: " + data.error + "\x1b[0m");
        setVideos([]);
        setFilteredVideos([]);
        return;
      }
      const newVideos = data
        .filter((item: Video) => item.id && item.url)
        .map((item: Video) => ({
          id: item.id,
          name: item.name || "Unnamed Video",
          path: item.path || `/videos/${item.id}.${item.fileType}`,
          url: item.url || `/videos/${item.id}.${item.fileType}`,
          fileType: item.fileType || "mp4",
          thumbnail: item.thumbnail || FALLBACK_IMAGE.src,
          preview: item.preview || `thumbnails/preview/${item.id}.webm`,
          duration: item.duration || 0,
          createdAt: item.createdAt || new Date().toISOString(),
        }));
      setVideos(newVideos);
      setFilteredVideos(newVideos);
      logger.info(`\x1b[32mFetched ${newVideos.length} videos successfully\x1b[0m`);
    } catch (error) {
      logger.error("\x1b[31mFailed to fetch videos: " + error.message + "\x1b[0m");
      setVideos([]);
      setFilteredVideos([]);
    }
  };

  // Dynamically set image dimensions
  useEffect(() => {
    const updateCardWidth = () => {
      if (gridItemRef.current) {
        const width = gridItemRef.current.getBoundingClientRect().width;
        setCardWidth(width);
      }
    };
    updateCardWidth();
    const resizeObserver = new ResizeObserver(updateCardWidth);
    if (gridItemRef.current) resizeObserver.observe(gridItemRef.current);
    return () => {
      if (gridItemRef.current) resizeObserver.unobserve(gridItemRef.current);
    };
  }, []);

  // Filter and sort videos
  useEffect(() => {
    let filtered = [...videos];
    if (filter !== "all") {
      filtered = filtered.filter((video) => video.fileType === filter);
    }
    if (search) {
      filtered = filtered.filter((video) => {
        const matchesName = video.name.toLowerCase().includes(search.toLowerCase());
        const videoTags = tags.find((t) => t.videoId === video.id)?.tags || [];
        const matchesTags = videoTags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        );
        return matchesName || matchesTags;
      });
    }
    setFilteredVideos(filtered);
    setVisibleCount(20);
  }, [filter, search, videos, tags]);

  // Lazy load more videos
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, filteredVideos.length));
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => {
      if (loadMoreRef.current && observerRef.current)
        observerRef.current.unobserve(loadMoreRef.current);
    };
  }, [filteredVideos]);

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(URL.revokeObjectURL);
    };
  }, [previewUrls]);

  // Initial data load
  useEffect(() => {
    fetchVideos();
  }, []);

  // Handle video selection
  const handleVideoClick = (video: Video) => {
    setScrollPosition(window.scrollY);
    setSelectedVideo(video);
    logger.info(`\x1b[36mVideo clicked: ${video.id}\x1b[0m`);
  };

  // Close video player
  const handleCloseDetail = () => {
    setSelectedVideo(null);
    setLoopVideo(false);
    window.scrollTo({ top: scrollPosition, behavior: "auto" });
    logger.info("\x1b[36mVideo player closed\x1b[0m");
  };

  // Navigate to previous video
  const handlePrevVideo = () => {
    const currentIndex = filteredVideos.findIndex((vid) => vid.id === selectedVideo?.id);
    if (currentIndex > 0) {
      setSelectedVideo(filteredVideos[currentIndex - 1]);
      logger.info(
        `\x1b[36mNavigated to previous video: ${filteredVideos[currentIndex - 1].id}\x1b[0m`,
      );
    }
  };

  // Navigate to next video
  const handleNextVideo = () => {
    const currentIndex = filteredVideos.findIndex((vid) => vid.id === selectedVideo?.id);
    if (currentIndex < filteredVideos.length - 1) {
      setSelectedVideo(filteredVideos[currentIndex + 1]);
      logger.info(
        `\x1b[36mNavigated to next video: ${filteredVideos[currentIndex + 1].id}\x1b[0m`,
      );
    }
  };

  // Navigate to previous page
  const handlePrevPage = () => {
    const currentIndex = Math.max(0, visibleCount - 40);
    setVisibleCount(currentIndex + 20);
    const element = document.querySelector(`.gallery-item:nth-child(${currentIndex + 1})`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      logger.info("\x1b[36mNavigated to previous page\x1b[0m");
    }
  };

  // Navigate to next page
  const handleNextPage = () => {
    const currentIndex = visibleCount;
    setVisibleCount(currentIndex + 20);
    const element = document.querySelector(`.gallery-item:nth-child(${currentIndex + 1})`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      logger.info("\x1b[36mNavigated to next page\x1b[0m");
    }
  };

  // Handle mouse hover for preview
  const handleMouseEnter = debounce((video: Video) => {
    logger.info(`\x1b[36mMouse enter for video ${video.id}: ${video.preview}\x1b[0m`);
    const timer = setTimeout(() => {
      setPreviewUrls((prev) => ({ ...prev, [video.id]: video.preview }));
    }, 200);
    videoTimers.current[video.id] = timer;
  }, 100);

  // Handle mouse leave for preview
  const handleMouseLeave = (video: Video) => {
    if (videoTimers.current[video.id]) {
      clearTimeout(videoTimers.current[video.id]);
      delete videoTimers.current[video.id];
    }
    setPreviewUrls((prev) => {
      const newUrls = { ...prev };
      if (newUrls[video.id]) {
        URL.revokeObjectURL(newUrls[video.id]);
        delete newUrls[video.id];
      }
      return newUrls;
    });
    logger.info(`\x1b[36mMouse leave for video ${video.id}\x1b[0m`);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNextVideo,
    onSwipedRight: handlePrevVideo,
    onSwipedUp: handleCloseDetail,
    onSwipedDown: handleCloseDetail,
    delta: 10,
    trackTouch: true,
    trackMouse: false,
  });

  return (
    <div className="app-container">
      <Nav />
      <Header
        search={search}
        filter={filter}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onRefresh={fetchVideos}
      />
      <div className="gallery" ref={galleryRef}>
        <div className="pagination-buttons sticky top-0 z-10 m-10 flex justify-between px-2 py-2">
          <Button
            variant="outline"
            className="b2"
            onClick={handlePrevPage}
            disabled={visibleCount <= 20}
          >
            ← Prev
          </Button>
          <Button
            variant="outline"
            className="b2"
            onClick={handleNextPage}
            disabled={visibleCount >= filteredVideos.length}
          >
            Next →
          </Button>
        </div>
        {selectedVideo ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            {...swipeHandlers}
          >
            <div className="relative h-[98vh] max-w-[98vw] w-full flex flex-col items-center bg-black/50">
              <div className="absolute top-0 w-full flex justify-center gap-2 p-2 z-10">
                <Button
                  variant="outline"
                  className="b2"
                  onClick={handlePrevVideo}
                  disabled={filteredVideos.findIndex((vid) => vid.id === selectedVideo.id) === 0}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  className="b2"
                  onClick={handleNextVideo}
                  disabled={
                    filteredVideos.findIndex((vid) => vid.id === selectedVideo.id) ===
                    filteredVideos.length - 1
                  }
                >
                  →
                </Button>
                <Button
                  variant="outline"
                  className="b2"
                  onClick={() => setLoopVideo(!loopVideo)}
                >
                  {loopVideo ? "Loop Off" : "Loop On"}
                </Button>
                <Button variant="outline" className="b2" onClick={handleCloseDetail}>
                  Close
                </Button>
              </div>
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                loop={loopVideo}
                className="media-card w-full h-full object-contain"
                onError={(e) =>
                  logger.error(`\x1b[31mVideo failed to load: ${selectedVideo.url}\x1b[0m`)
                }
              />
            </div>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredVideos.length === 0 ? (
              <p className="text-center text-white">No videos available</p>
            ) : (
              filteredVideos.slice(0, visibleCount).map((video, index) => {
                const videoTags = tags.find((t) => t.videoId === video.id)?.tags || [];
                return (
                  <motion.div
                    key={video.id}
                    className="media-card gallery-item glow"
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    onClick={() => handleVideoClick(video)}
                    onMouseEnter={() => handleMouseEnter(video)}
                    onMouseLeave={() => handleMouseLeave(video)}
                    ref={index === 0 ? gridItemRef : null}
                  >
                    <Image
                      src={video.thumbnail || FALLBACK_IMAGE.src} // Use thumbnail, not preview
                      alt={`Thumbnail ${video.name}`}
                      width={cardWidth}
                      height={cardWidth * (3 / 4)}
                      quality={85}
                      className="jpg-preview"
                      loading={index >= 20 ? "lazy" : "eager"} // Lazy load after first 20
                      priority={index < 4} // Priority for first 4
                      style={{ objectFit: cardWidth < 768 ? "contain" : "cover" }}
                      onError={(e) => {
                        logger.error(
                          `\x1b[31mImage failed to load: ${e.currentTarget.src}\x1b[0m`,
                        );
                        e.currentTarget.src = FALLBACK_IMAGE.src;
                      }}
                    />
                    {previewUrls[video.id] && (
                      <video
                        src={previewUrls[video.id]}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload={index >= 20 ? "none" : "auto"} // Lazy load previews after first 20
                        width={cardWidth}
                        height={cardWidth * (3 / 4)}
                        className="webm-preview absolute top-0 left-0"
                        style={{ objectFit: cardWidth < 768 ? "contain" : "cover" }}
                        onError={(e) =>
                          logger.error(
                            `\x1b[31mWebM preview failed to load: ${previewUrls[video.id]}\x1b[0m`,
                          )
                        }
                      />
                    )}
                    <div className="metadata-bubble video-name">{video.name}</div>
                    <div className="metadata-bubble runtime">{video.fileType}</div>
                    <div className="metadata-bubble duration">
                      {formatDuration(video.duration || 0)}
                    </div>
                    {videoTags.length > 0 && (
                      <div className="metadata-bubble tags">{videoTags.join(", ")}</div>
                    )}
                  </motion.div>
                );
              })
            )}
            {visibleCount < filteredVideos.length && <div ref={loadMoreRef} className="h-10" />}
          </div>
        )}
      </div>
      <footer className="footer">
        <h3 className="text-center indent-2">
          Web design by
          <br />
          Developed for mobile screens
        </h3>
      </footer>
    </div>
  );
};

export default Videos;