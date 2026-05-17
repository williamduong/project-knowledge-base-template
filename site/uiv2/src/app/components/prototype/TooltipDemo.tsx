export default function TooltipDemo() {
  return (
    <div className="component-card tooltip-demo">
      <strong>Tooltips</strong>
      <div className="tooltip-row">
        <button className="tool-button" data-tooltip="This is a tooltip">Hover me</button>
        <span className="tooltip-anchor" data-tooltip="Another helpful tip">Hover this text</span>
      </div>
    </div>
  )
}
