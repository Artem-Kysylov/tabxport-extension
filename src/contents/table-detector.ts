import { init } from "./init"

export { config } from "./config"

// Запуск инициализации в зависимости от состояния документа
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      console.error("TabXport: Initialization error:", error)
    })
  })
} else {
  init().catch((error) => {
    console.error("TabXport: Initialization error:", error)
  })
}
