import { init } from "./init"

export { config } from "./config"

// Запуск инициализации в зависимости от состояния документа
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("TabXport: DOMContentLoaded event fired")
    init().catch((error) => {
      console.error("TabXport: Initialization error:", error)
    })
  })
} else {
  console.log(`TabXport: Document is ${document.readyState}`)
  init().catch((error) => {
    console.error("TabXport: Initialization error:", error)
  })
}
