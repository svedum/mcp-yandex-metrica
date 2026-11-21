import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TokenStore } from "../auth.js";
import { fail, ok, READ_ONLY } from "./util.js";

export function registerAuthTools(server: McpServer, tokens: TokenStore): void {
  server.registerTool(
    "auth_status",
    {
      title: "Статус подключения к Метрике",
      annotations: READ_ONLY,
      description:
        "Показывает, подключена ли Яндекс Метрика: есть ли токен, откуда он взят (YANDEX_METRIKA_TOKEN или файл PLUGIN_OAUTH_CREDENTIALS_PATH от Сведума), когда истекает. Ничего не отправляет в сеть и не показывает сам токен. Вызовите это, если инструменты Метрики отвечают, что подключение не настроено.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(tokens.status());
      } catch (e) {
        return fail(e);
      }
    },
  );
}