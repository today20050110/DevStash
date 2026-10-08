// Monaco 的 editor worker 入口，由 monaco-setup.ts 以 new Worker(new URL(...)) 建立，
// bundler 會把它打包成獨立的 worker 檔案
import "monaco-editor/esm/vs/editor/editor.worker";
