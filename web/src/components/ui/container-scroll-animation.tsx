"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Adjusted offset for earlier reveal
  const { scrollYProgress: scrollYProgressLocal } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgressLocal, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgressLocal, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgressLocal, [0, 1], [0, -100]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex w-full flex-col items-center px-4 pb-10 pt-2 md:hidden">
        <div className="w-full max-w-md text-center">{titleComponent}</div>
        <div className="mt-6 w-full max-w-[19rem] rounded-[1.5rem] border-[5px] border-slate-800 bg-slate-900 p-1.5 shadow-2xl shadow-slate-900/25">
          <div className="h-[18.5rem] overflow-hidden rounded-[1.1rem] bg-slate-100">
            {children}
          </div>
        </div>
      </div>

      <div className="relative hidden h-[80rem] w-full items-center justify-center p-20 md:flex">
        <div
          className="relative w-full py-40"
          style={{
            perspective: "1000px",
          }}
        >
          <Header translate={translate} titleComponent={titleComponent} />
          <Card rotate={rotate} translate={translate} scale={scale}>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl"
    >
      <div className=" h-full w-full  overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4 ">
        {children}
      </div>
    </motion.div>
  );
};
