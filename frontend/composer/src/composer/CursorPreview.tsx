import {
  type BaseDuration,
  type HoverPreview,
} from './constants'
import {
  getDurationPreviewClass,
  getPitchLabels,
} from './score'

export function CursorPreview({
  baseDuration,
  dotted,
  preview,
}: {
  baseDuration: BaseDuration
  dotted: boolean
  preview: HoverPreview
}) {
  return (
    <div
      className="cursor-preview"
      style={{ left: `${preview.x}px`, top: `${preview.y}px` }}
    >
      <div
        className={`cursor-note cursor-note--${getDurationPreviewClass(baseDuration)}`}
      >
        <span className="cursor-head" />
        {baseDuration !== 'w' ? <span className="cursor-stem" /> : null}
        {baseDuration === '8' || baseDuration === '16' ? (
          <span className="cursor-flag cursor-flag--1" />
        ) : null}
        {baseDuration === '16' ? (
          <span className="cursor-flag cursor-flag--2" />
        ) : null}
        {dotted ? <span className="cursor-dot" /> : null}
      </div>
      <div className="cursor-label">{getPitchLabels(preview.pitches)}</div>
    </div>
  )
}
