"use client";

import { useState, useCallback } from "react";
import { Check, Copy, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ChoiceCardShareProps {
  onGetLink: () => Promise<string>;
  onCopyLink: () => void;
  hasChoices: boolean;
}

export function ChoiceCardShare({ onGetLink, onCopyLink, hasChoices }: ChoiceCardShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      setLink("");
      void onGetLink().then((url) => {
        setLink(url);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [onGetLink]);

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="brand-peach"
            disabled={!hasChoices}
          >
            <Share2 className="size-4" /> مشاركة
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md [&_[data-slot=dialog-close]]:left-2 [&_[data-slot=dialog-close]]:right-auto">
        <DialogHeader>
          <DialogTitle>مشاركة بطاقة الاختيارات</DialogTitle>
        </DialogHeader>

        {!hasChoices ? (
          <p className="py-4 text-center text-sm text-muted-text">
            أضف اختياراتك أولاً قبل المشاركة
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={loading ? "جاري تحميل الرابط..." : link}
                readOnly
                className="ltr flex-1 font-mono text-xs"
                dir="ltr"
              />
              <Button
                variant={copied ? "brand-mint" : "brand-ochre"}
                onClick={handleCopy}
                className="shrink-0"
                disabled={loading || !link}
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /></>
                ) : copied ? (
                  <><Check className="size-4" /> تم</>
                ) : (
                  <><Copy className="size-4" /> نسخ</>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-text">
              شارك الرابط مع اي شخص بش يشوف اختياراتك
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
