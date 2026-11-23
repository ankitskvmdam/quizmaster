// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Markdown } from '@/components/markdown'

describe('Markdown', () => {
  it('renders inline maths with KaTeX', () => {
    const { container } = render(<Markdown source={'Area is $x^2$.'} />)
    expect(container.querySelector('.katex')).not.toBeNull()
  })

  it('turns a blockquote that starts with bold into a callout', () => {
    const { container } = render(<Markdown source={'> **Example**\n> Fifteen percent of 240 is 36.'} />)
    const callout = container.querySelector('[data-callout]')
    expect(callout?.getAttribute('data-callout')).toBe('example')
  })

  it('marks a Trap callout so it can be styled as a warning', () => {
    const { container } = render(<Markdown source={'> **Trap**\n> Different base.'} />)
    expect(container.querySelector('[data-callout="trap"]')).not.toBeNull()
  })

  it('wraps display maths so it scrolls on its own', () => {
    const { container } = render(<Markdown source={'$$\n\\frac{a}{b}\n$$'} />)
    expect(container.querySelector('[data-math-display]')).not.toBeNull()
  })

  it('renders an option inline, without a paragraph', () => {
    const { container } = render(<Markdown variant="option" source={'$25\\%$'} />)
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('.katex')).not.toBeNull()
  })
})
