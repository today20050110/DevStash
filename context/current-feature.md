# Current Feature: 收藏切換按鈕

## Status

In Progress

## Goals

- Item drawer：把停用的 Favorite 按鈕改為可用，點擊切換收藏，drawer 內的狀態（實心黃星／文字）即時更新
- Collection 詳細頁（`/collections/[id]`）：把停用的 Favorite 按鈕改為可用
- 卡片：
  - Item 卡片（`ItemCard`、`ImageCard`）加星號切換按鈕，與複製按鈕同列、疊在整張卡片的點擊層之上（`relative z-10`），點擊不會開啟 drawer
  - Collection 卡片（`CollectionCard`）名稱旁的星號改為切換按鈕，點擊不會進入 collection 頁；卡片「⋯」選單裡停用的 Favorite／Unfavorite 項目一併改為可用
- Server actions：`setItemFavorite(id, isFavorite)`（`src/actions/items.ts`）、`setCollectionFavorite(id, isFavorite)`（`src/actions/collections.ts`）；Zod 驗證、session 檢查、只改目前使用者且未刪除的資料，找不到一律回「Item not found」／「Collection not found」，回傳 `{ success, data, error }`
- 切換後 `router.refresh()`，讓側邊欄 Favorites、統計卡、`/favorites` 與其他列表同步
- 單元測試：兩個 action 的流程，以及 `src/lib/db/` 的寫入函式

## Notes

- 來源：inline 描述（「Add a favorite button to the drawer, collection page and cards to toggle」）
- 實作預設（待使用者確認，未回覆則照此實作）：
  - **設定而非翻轉**：action 接收目標值 `isFavorite`（不是「翻轉」），重複送出結果相同；兩個分頁同時操作時不會互相翻回去
  - **共用元件**：`src/components/favorites/FavoriteToggle.tsx`（client）：樂觀更新、送出期間停用、失敗時還原並顯示錯誤 toast；成功時顯示簡短 toast（「Added to favorites」／「Removed from favorites」），然後 `router.refresh()`。drawer、卡片、collection 頁共用，外觀以 props 區分（drawer／詳細頁為帶文字的 ghost 按鈕，卡片為 icon 按鈕）
  - **卡片上的星號**：可切換的按鈕取代原本只顯示用的星號（`ItemStatusIcons` 的星號、`CollectionCard` 名稱旁的星號），避免同一張卡片出現兩個星號；Pin 圖示照舊
  - **未收藏時的卡片按鈕**：顯示空心淡色星號（與複製按鈕同樣的 muted 樣式），收藏時為實心黃星
  - **drawer**：成功後以 `replaceItem` 更新 drawer 內的 item，並 `router.refresh()` 更新背後的卡片
  - **`updatedAt`**：Prisma 的 `@updatedAt` 會在切換時更新，所以 `/favorites` 依 `updatedAt` 排序剛好等於「最近收藏」（之後再編輯仍會改變順序）
  - **不加速率限制**：與編輯、刪除 item 相同，只改自己的資料
  - Pin 按鈕維持停用（不在本次範圍）
- 範圍外：檔案型別的單欄列表（`FileList`）與 `/favorites` 的列不加切換按鈕（描述只提 drawer、collection 頁與卡片）
- **無 migration**
- 實作補充：action 回傳型別 `FavoriteResult` 放在 `src/types/favorites.ts`；切換邏輯在 `src/hooks/use-favorite-toggle.ts`（樂觀更新、`callServerAction` 處理 reject、父層傳入的值改變時同步），`src/components/favorites/FavoriteButton.tsx` 以 `kind`（item／collection）選 action，因為 `ItemCard`／`CollectionCard` 是 server component，不能傳函式。collection 卡片的星號移出 `Link`（button 不能巢狀於 a），與「⋯」選單並排；選單項目直接用同一個 hook。`ItemStatusIcons` 只剩 Pin。collection 詳細頁 h1 旁的星號保留，refresh 後更新
- 驗證（2026-10-17）：`npx eslint src` 無錯誤、`npm test` 33 檔／340 項（新增 18 項）、`npm run build` 通過。瀏覽器以 demo 帳號實測：snippet 卡片星號切換（toast、不開 drawer、按鈕狀態更新）；drawer 的 Favorite → Favorited，背後卡片同步；`/favorites` 新收藏的兩筆排在最前（`updatedAt` 確實更新）；collection 卡片星號（不換頁、側邊欄 Favorites 即時加入）；卡片「⋯」選單 Unfavorite；collection 詳細頁取消再收藏（頁首按鈕與 h1 星號同步）；圖片卡片與 collection 卡片的版面截圖確認。測試後已全部還原，Neon Development 查詢 demo 帳號仍為 9 個 items、2 個 collections 收藏。console 無錯誤；dev server log 中的 `CredentialsSignin` 是先前手動登出／登入失敗留下的，與本功能無關
- 過程備註：一度以 prettier 格式化整個 `src/components` 等目錄，改到許多無關檔案（例如 `ui/sidebar.tsx`），已全數還原，只保留本功能的 14 個檔案與 2 個新檔

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
