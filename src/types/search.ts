/** command palette 可搜尋的 item：只帶搜尋與顯示需要的欄位 */
export interface SearchItem {
  id: string;
  title: string;
  type: {
    name: string;
    /** lucide-react icon name */
    icon: string;
    color: string;
  };
  /** content、url 或檔名的開頭一段，已壓成單行；都沒有時為 null */
  preview: string | null;
}

export interface SearchCollection {
  id: string;
  name: string;
  itemCount: number;
}

export interface SearchData {
  items: SearchItem[];
  collections: SearchCollection[];
}
