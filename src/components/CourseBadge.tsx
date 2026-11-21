/** Current-course badge (top-left). Will become the course switcher once more courses exist. */
export default function CourseBadge({ label = 'Tiếng Trung', title = 'Khóa học tiếng Trung HSK 1' }: { label?: string; title?: string }) {
  return (
    <span
      title={title}
      data-testid="course-badge"
      className="flex h-8 items-center justify-center whitespace-nowrap rounded-lg bg-coral-500 px-2.5 text-[13px] font-black leading-none text-sun-400 shadow-[0_3px_0_#d93a3a]"
    >
      {label}
    </span>
  );
}
