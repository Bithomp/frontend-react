import Link from 'next/link'
import { useRouter } from 'next/router'
import { FaChevronRight } from 'react-icons/fa'

export default function Breadcrumbs() {
  const router = useRouter()
  const pathSegments = router.asPath.split('/').filter(segment => segment)

  // Build breadcrumb items
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`
    const label = segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    
    return {
      href,
      label,
      isCurrentPage: index === pathSegments.length - 1
    }
  })

  return (
    <nav aria-label="Breadcrumb" className="py-3">
      <ol className="flex items-center ps-0 space-x-2 list-none">
        <li>
          <Link 
            href="/"
            className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Home"
          >
            <span className="sm:inline">Home</span>
          </Link>
        </li>
        
        {breadcrumbs.map((breadcrumb) => (
          <li key={breadcrumb.href} className="flex items-center">
            <FaChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            {breadcrumb.isCurrentPage ? (
              <span 
                className="text-gray-900 dark:text-gray-100 font-medium"
                aria-current="page"
              >
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
