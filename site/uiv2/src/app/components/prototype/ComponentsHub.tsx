import CalendarDemo from './CalendarDemo'
import TagsInput from './TagsInput'
import FileUploader from './FileUploader'
import ToastsDemo from './ToastsDemo'
import TooltipDemo from './TooltipDemo'
import AvatarChips from './AvatarChips'
import VirtualTableDemo from './VirtualTableDemo'
import TimelineDemo from './TimelineDemo'
import RichTextDemo from './RichTextDemo'
import KanbanDemo from './KanbanDemo'

export default function ComponentsHub() {
  return (
    <div className="components-hub">
      <div className="components-grid">
        <CalendarDemo />
        <TagsInput />
        <FileUploader />
        <ToastsDemo />
        <TooltipDemo />
        <AvatarChips />
        <VirtualTableDemo />
        <TimelineDemo />
        <RichTextDemo />
        <KanbanDemo />
      </div>
    </div>
  )
}
