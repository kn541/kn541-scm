'use client'

// React Imports
import type { ReactElement } from 'react'

// Type Imports
import type { SystemMode } from '@core/types'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'

type LayoutWrapperProps = {
  systemMode: SystemMode
  verticalLayout: ReactElement
  horizontalLayout: ReactElement
  /** SCM 대시보드: 쿠키에 horizontal이 남아 있어도 사이드바(수직) 고정 */
  forceVertical?: boolean
}

const LayoutWrapper = (props: LayoutWrapperProps) => {
  // Props
  const { systemMode, verticalLayout, horizontalLayout, forceVertical } = props

  // Hooks
  const { settings } = useSettings()

  useLayoutInit(systemMode)

  const useHorizontal = !forceVertical && settings.layout === 'horizontal'

  // Return the layout based on the layout context
  return (
    <div className='flex flex-col flex-auto' data-skin={settings.skin}>
      {useHorizontal ? horizontalLayout : verticalLayout}
    </div>
  )
}

export default LayoutWrapper
