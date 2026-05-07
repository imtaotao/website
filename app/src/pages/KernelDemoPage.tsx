import { DemoCard } from '@website-kernel/demo';

import '@website-kernel/demo/style.css';

import '#app/pages/HomePage.css';

export default function KernelDemoPage() {
  return (
    <div className="homePage">
      <div className="homePage__main">
        <h1 className="homePage__title">Kernel Demo</h1>
        <p className="homePage__desc">
          用于验证 packages 构建：TSX、普通 CSS、Tailwind CSS。
        </p>
        <DemoCard />
      </div>
    </div>
  );
}
