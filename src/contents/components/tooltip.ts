interface TooltipOptions {
  text: string
  targetElement: HTMLElement
}

interface TooltipControls {
  show: () => void
  hide: () => void
  destroy: () => void
}

const createTooltipElement = (text: string): HTMLDivElement => {
  const tooltip = document.createElement("div")

  tooltip.style.cssText = `
    position: absolute !important;
    background-color: #000000 !important;
    color: #ffffff !important;
    padding: 8px 12px !important;
    border-radius: 10px !important;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 15px !important;
    line-height: normal !important;
    font-weight: normal !important;
    pointer-events: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    transition: all 0.3s ease !important;
    z-index: 1000000 !important;
    text-align: center !important;
    white-space: nowrap !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
    margin: 0 !important;
    border: none !important;
    min-width: auto !important;
    min-height: auto !important;
    max-width: none !important;
    max-height: none !important;
    transform: none !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    text-decoration: none !important;
    text-indent: 0 !important;
    text-shadow: none !important;
  `

  // Добавляем стрелку через псевдоэлемент
  const arrow = document.createElement("div")
  arrow.style.cssText = `
    position: absolute !important;
    top: 50% !important;
    right: -4px !important;
    transform: translateY(-50%) rotate(45deg) !important;
    width: 8px !important;
    height: 8px !important;
    background-color: #000000 !important;
  `

  tooltip.textContent = text
  tooltip.appendChild(arrow)

  return tooltip
}

const positionTooltip = (
  tooltip: HTMLDivElement,
  targetElement: HTMLElement
): void => {
  const targetRect = targetElement.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()

  // Позиционируем тултип слева от кнопки
  const top = targetRect.top + (targetRect.height - tooltipRect.height) / 2
  const left = targetRect.left - tooltipRect.width - 12 // 12px отступ от кнопки

  tooltip.style.top = `${top}px`
  tooltip.style.left = `${left}px`
}

export const createTooltip = ({
  text,
  targetElement
}: TooltipOptions): TooltipControls => {
  const tooltipElement = createTooltipElement(text)
  document.body.appendChild(tooltipElement)

  const show = (): void => {
    positionTooltip(tooltipElement, targetElement)
    tooltipElement.style.opacity = "1"
    tooltipElement.style.visibility = "visible"
  }

  const hide = (): void => {
    tooltipElement.style.opacity = "0"
    tooltipElement.style.visibility = "hidden"
  }

  const destroy = (): void => {
    if (tooltipElement.parentNode) {
      tooltipElement.parentNode.removeChild(tooltipElement)
    }
  }

  return {
    show,
    hide,
    destroy
  }
}
