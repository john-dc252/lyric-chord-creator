interface SheetSettingsSectionProps {
  ref?: (el: HTMLElement) => void;
}

export function SheetSettingsSection(props: SheetSettingsSectionProps) {
  return (
    <section
      ref={props.ref}
      id="sheet-settings"
      class="mb-10 scroll-mt-8"
    >
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
        <span class="i-lucide-settings w-5 h-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        <span>Sheet Settings</span>
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Page layout and transposition controls live in the preview toolbar, independent of template text.
      </p>

      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table class="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th scope="col" class="py-3 px-4 sm:px-6 w-48 sm:w-56">Setting</th>
              <th scope="col" class="py-3 px-4 sm:px-6">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr>
              <td class="py-3 px-4 sm:px-6 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                Key Transposition
              </td>
              <td class="py-3 px-4 sm:px-6 leading-relaxed">
                Shift chords up or down (±11 semitones) for preview and print without modifying the template.
              </td>
            </tr>
            <tr>
              <td class="py-3 px-4 sm:px-6 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                Orientation & Columns
              </td>
              <td class="py-3 px-4 sm:px-6 leading-relaxed">
                Portrait takes 1–2 columns, landscape up to 4. Switching back to portrait clamps a wider layout down
                automatically.
              </td>
            </tr>
            <tr>
              <td class="py-3 px-4 sm:px-6 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                Paper Size
              </td>
              <td class="py-3 px-4 sm:px-6 leading-relaxed">
                Letter, Legal, A4, or a custom width and height in inches or centimeters.
              </td>
            </tr>
            <tr>
              <td class="py-3 px-4 sm:px-6 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                Type & Margins
              </td>
              <td class="py-3 px-4 sm:px-6 leading-relaxed">
                Font size from 6 to 20pt, with narrow, normal, or wide margins — or your own value.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
