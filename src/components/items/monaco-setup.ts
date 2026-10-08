import { loader } from "@monaco-editor/react";
// 只引入編輯器核心，不含 monaco-editor 主入口的 TypeScript／JSON／CSS／HTML 語言服務
// （各自需要額外的 worker 與數 MB 的程式碼）；上色由下面的 Monarch 語言模組負責
import * as monaco from "monaco-editor/esm/vs/editor/edcore.main";

// 與 src/lib/code-language.ts 的 MONACO_LANGUAGES 對應；新增語言時兩邊都要加
// （bundler 只能打包靜態 import，無法依清單動態引入）。cpp 同時註冊 c 與 cpp
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
import "monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/basic-languages/dart/dart.contribution";
import "monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution";
import "monaco-editor/esm/vs/basic-languages/go/go.contribution";
import "monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution";
import "monaco-editor/esm/vs/basic-languages/html/html.contribution";
import "monaco-editor/esm/vs/basic-languages/ini/ini.contribution";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution";
import "monaco-editor/esm/vs/basic-languages/less/less.contribution";
import "monaco-editor/esm/vs/basic-languages/lua/lua.contribution";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
import "monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution";
import "monaco-editor/esm/vs/basic-languages/pgsql/pgsql.contribution";
import "monaco-editor/esm/vs/basic-languages/php/php.contribution";
import "monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/r/r.contribution";
import "monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution";
import "monaco-editor/esm/vs/basic-languages/rust/rust.contribution";
import "monaco-editor/esm/vs/basic-languages/scss/scss.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
import "monaco-editor/esm/vs/basic-languages/swift/swift.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import "monaco-editor/esm/vs/basic-languages/xml/xml.contribution";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";

// 只有核心的 editor worker（diff、自動換行等計算）；沒有語言服務就不需要其他 worker
self.MonacoEnvironment = {
  getWorker: () =>
    new Worker(new URL("./monaco.worker.ts", import.meta.url), {
      type: "module",
    }),
};

// 交給 @monaco-editor/react 使用本機打包的 monaco，不再從 jsDelivr CDN 載入
loader.config({ monaco });
