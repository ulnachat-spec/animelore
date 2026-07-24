import Link from "next/link";
import { MeiState } from "@/components/mei-state";

export default function OfflinePage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
      <MeiState
        eyebrow="网络暂时离馆"
        title="芽衣把已经看过的档案留在本机了"
        description="恢复网络后可以继续搜索新作品；离线时也可以尝试返回刚才浏览过的页面。"
      >
        <Link href="/" className="archive-button-primary">
          回到档案馆
        </Link>
      </MeiState>
    </main>
  );
}
