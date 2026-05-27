import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('keeps dashboard thin and points operators to the factory workspaces', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText(/Dashboard stays intentionally thin/i)).toBeInTheDocument()
    expect(screen.getByText('1. Code')).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: 'Open' })
        .some((link) => link.getAttribute('href') === '/code'),
    ).toBe(true)
  })
})
