import React, { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

export const AnimatedCounter = ({ from, to }: { from: number; to: number }) => {
  const [count, setCount] = useState(from);

  useEffect(() => {
    const controls = animate(from, to, {
      duration: 1.5,
      onUpdate(value) {
        setCount(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [from, to]);

  return <span>{count}</span>;
};
