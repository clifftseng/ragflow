// 檔案路徑: web/src/pages/km/dataset/ReparseIcon.tsx
// 這是一個全新的 SVG 圖示元件

import React from 'react';

export const ReparseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14.167 4.271A7.083 7.083 0 0 1 10 17.083h-.417m-3.75-1.354A7.083 7.083 0 0 1 10 2.917h.417m.416 15.75L9.167 17l1.666-1.667M9.167 4.667L10.833 3L9.167 1.333"
      stroke="#17B26A" // 您可以根據主題修改顏色，或通過 props 傳遞
      strokeWidth="1.667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);