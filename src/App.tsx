import { useRef, useState } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { About } from './components/About'
import { SelectedWork } from './components/SelectedWork'
import { CaseStudies } from './components/CaseStudies'
import { Learning } from './components/Learning'
import { Skills } from './components/Skills'
import { Twin, type TwinHandle } from './components/Twin'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { useActiveSection } from './hooks/useActiveSection'
import { projects } from './portfolio'

const SECTION_IDS = ['about', 'work', 'case-studies', 'learning', 'skills', 'twin', 'contact']

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
}

export function App() {
  const [selectedId, setSelectedId] = useState(projects[0].id)
  const twin = useRef<TwinHandle>(null)
  const active = useActiveSection(SECTION_IDS)

  function openProject(id: string) {
    setSelectedId(id)
    scrollToSection('case-studies')
  }

  /** Returns whether the twin accepted the question (it refuses while another answer is pending). */
  function askTwin(question: string): boolean {
    scrollToSection('twin')
    const accepted = twin.current?.ask(question) ?? false
    // Keyboard and screen-reader users land on the conversation, where the answer or notice appears.
    document.getElementById('twin-log')?.focus({ preventScroll: true })
    return accepted
  }

  function goToTwin() {
    scrollToSection('twin')
    document.getElementById('twin-input')?.focus({ preventScroll: true })
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-3 focus:font-mono focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      <Header active={active} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero onAsk={askTwin} />
        <About />
        <SelectedWork onOpen={openProject} />
        <CaseStudies selectedId={selectedId} onSelect={setSelectedId} onAsk={askTwin} />
        <Learning onOpen={openProject} />
        <Skills />
        <Twin ref={twin} onOpenProject={openProject} />
        <Contact onAsk={goToTwin} />
      </main>
      <Footer />
    </>
  )
}
