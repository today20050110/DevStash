# Current Feature

## Status

Not Started

## Goals

<!-- 以 /feature load 載入 spec 後填入；成功長什麼樣子 -->

## Notes

<!-- 來源、限制、實作方向、驗證結果、已知情況 -->

- **排隊中：Auth Nav & Dashboard Logo**（inline 描述「add the homepage top nav to the sign in and sign up pages. Then add the same folder icon that the homepage nav has for the logo to the dashboard nav.」，以 `/feature load` 重新載入後從 master 開分支）
  - 已確認的決定：
    - 首頁導覽列放在 `(auth)/layout.tsx`，四個 auth 頁（sign-in、register、forgot-password、reset-password）一起加，用未登入的連結
    - Features／Pricing 在 auth 頁改連 `/#features`、`/#pricing`
    - 拿掉 auth layout 原本置中的 logo；固定導覽列不能蓋住表單
    - 「folder icon」其實是 lucide 的 `Layers`：把側邊欄頂端 logo 改成首頁 `Logo` 的樣式（indigo、無底框），仍連到 `/dashboard`，不在 top bar 新增 logo

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
