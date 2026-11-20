import { Title } from '@solidjs/meta';
import { createSignal } from 'solid-js';
import { ExamplesSection } from './ExamplesSection';
import { JUMP_SECTIONS, Jumplist, type SectionId } from './Jumplist';
import { MonospaceGuideSection } from './MonospaceGuideSection';
import { OverviewSection } from './OverviewSection';
import { SheetSettingsSection } from './SheetSettingsSection';
import { SyntaxGuideSection } from './SyntaxGuideSection';

export default function About() {
  const [activeSection, setActiveSection] = createSignal<SectionId>('overview', {
    name: 'active_about_section',
  });

  let scrollContainerRef: HTMLDivElement | undefined = undefined;
  const sectionRefs: Partial<Record<SectionId, HTMLElement>> = {};

  // Scroll via the ref rather than the `#syntax-guide` fragment: under
  // hashHistory the hash is the route, so the router intercepts the anchor and
  // resolves the fragment as a path instead of scrolling.
  const scrollToSection = (id: SectionId, e?: MouseEvent) => {
    e?.preventDefault();
    setActiveSection(id);
    sectionRefs[id]?.scrollIntoView({ behavior: 'instant', block: 'start' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef) return;
    const containerTop = scrollContainerRef.getBoundingClientRect().top;
    const threshold = 120;

    // If scrolled to the very bottom, activate the last section
    const isAtBottom =
      scrollContainerRef.scrollHeight - scrollContainerRef.scrollTop - scrollContainerRef.clientHeight <= 24;
    if (isAtBottom) {
      setActiveSection(JUMP_SECTIONS[JUMP_SECTIONS.length - 1].id);
      return;
    }

    let current: SectionId = JUMP_SECTIONS[0].id;
    for (const section of JUMP_SECTIONS) {
      const el = sectionRefs[section.id];
      if (!el) continue;
      const offsetTop = el.getBoundingClientRect().top - containerTop;
      if (offsetTop <= threshold) {
        current = section.id;
      }
    }
    setActiveSection(current);
  };

  return (
    <div
      ref={(el) => (scrollContainerRef = el)}
      onScroll={handleScroll}
      class="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
    >
      <Title>About - Lyric-Chord Creator</Title>

      <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex items-start gap-8">
        <Jumplist
          activeSection={activeSection()}
          onSelectSection={scrollToSection}
        />

        <main class="flex-1 min-w-0 max-w-5xl w-full">
          <OverviewSection
            ref={(el) => (sectionRefs.overview = el)}
            onSelectSection={scrollToSection}
          />
          <SyntaxGuideSection
            ref={(el) => (sectionRefs['syntax-guide'] = el)}
          />
          <MonospaceGuideSection
            ref={(el) => (sectionRefs['monospace-guide'] = el)}
          />
          <ExamplesSection
            ref={(el) => (sectionRefs.examples = el)}
          />
          <SheetSettingsSection
            ref={(el) => (sectionRefs['sheet-settings'] = el)}
          />
        </main>
      </div>
    </div>
  );
}
