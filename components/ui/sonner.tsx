"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      dir="rtl"
      position="top-center"
      toastOptions={{
        style: {
          background: "#fffaf0",
          color: "#0a0a0a",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
          fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        },
      }}
      {...props}
    />
  );
}
