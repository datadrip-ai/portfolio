"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import "@/globals.css";
import Services from "@/components/ui/services";

import Nav from "@/components/ui/nav";

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const galleryRef = useRef(null);
  const loadMoreRef = useRef(null);

  /* Fetch images from API */
  const fetchImages = async () => {
    try {
      const response = await fetch("/api/gallery");
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      const newImages = data.images.map((item) => ({
        image: item.image,
        timestamp: new Date(item.ctime).getTime(),
      }));
      setImages((current) => {
        const uniqueImages = newImages.filter(
          (newImg) => !current.some((img) => img.image === newImg.image)
        );
        return [...current, ...uniqueImages].slice(0, page * 16);
      });
      setHasMore(newImages.length > 0);
    } catch (error) {
      console.error(
        "Failed to fetch images:",
        error.message || "Unknown error"
      );
    }
  };

  /* Fetch on page change */
  useEffect(() => {
    fetchImages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* Infinite scroll */
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setPage((page) => page + 1);
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div className="app-container">
      <Nav />
        <Services />
      <div className="gallery pt-0 ">
        <div ref={galleryRef} className="gallery-grid">
          {images.map((img, index) => (
            <motion.div
              key={img.image}
              className="gallery-item hover:shadow-white delay-1 transition-all duration-800"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -100 }}
              exit={{ opacity: 1, y: -50 }}
              transition={{ duration: 1 }}
            >
              <Image
                src={img.image}
                alt={`Image ${index + 1}`}
                width={800}
                height={600}
                quality={85}
                className="gallery-image opacity-100 mix-blend-lighten"
                loading={index > 10 ? "lazy" : "eager"}
                priority={index <= 3}
                onError={() => console.error(`Failed to load: ${img.image}`)}
              />
            </motion.div>
          ))}
        </div>
        {hasMore && (
          <div ref={loadMoreRef} className="load-more invisible"></div>
        )}
      </div>
      </div>
  );
};

export default Gallery;
