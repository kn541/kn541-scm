// React Imports
import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

// Third-party Imports
import type { CSSObject } from '@emotion/styled'

// Type Imports
import type { ChildrenType, RenderExpandedMenuItemIcon } from '../types'

// Component Imports
import {
  SubMenu as HorizontalSubMenu,
  MenuItem as HorizontalMenuItem,
  Menu as HorizontalMenu
} from '../horizontal-menu'
import { SubMenu as VerticalSubMenu, MenuItem as VerticalMenuItem, Menu as VerticalMenu } from '../vertical-menu'
import { GenerateVerticalMenu } from '@components/GenerateMenu'

// Util Imports
import { menuClasses } from './menuClasses'

// Styled Component Imports
import StyledMenuIcon from '../styles/StyledMenuIcon'

type RenderMenuIconParams = {
  level?: number
  active?: boolean
  disabled?: boolean
  styles?: CSSObject
  icon?: ReactElement
  renderExpandedMenuItemIcon?: RenderExpandedMenuItemIcon
  isBreakpointReached?: boolean
}

// Type guard for ReactElement with specific props
type MenuItemElementProps = {
  component?: string | ReactElement<{ href?: string; [key: string]: unknown }>
  href?: string
  exactMatch?: boolean
  activeUrl?: string
  children?: ReactNode
  [key: string]: unknown
}

export const confirmUrlInChildren = (children: ChildrenType['children'], url: string): boolean => {
  if (!children) {
    return false
  }

  if (Array.isArray(children)) {
    return children.some((child: ReactNode) => confirmUrlInChildren(child, url))
  }

  if (isValidElement<MenuItemElementProps>(children)) {
    // 방어: props가 없을 수 있음 (RSC 직렬화 환경)
    if (!children.props) return false

    const { component, href, exactMatch, activeUrl, children: subChildren } = children.props

    if (component && typeof component !== 'string' && component.props?.href) {
      return exactMatch === true || exactMatch === undefined
        ? component.props.href === url
        : activeUrl !== undefined && url.includes(activeUrl)
    }

    if (href) {
      return exactMatch === true || exactMatch === undefined
        ? href === url
        : activeUrl !== undefined && url.includes(activeUrl)
    }

    if (subChildren) {
      return confirmUrlInChildren(subChildren, url)
    }
  }

  return false
}

/*
 * Reason behind mapping the children of the horizontal-menu component to the vertical-menu component:
 * The Horizontal menu components will not work inside of Vertical menu on small screens.
 * So, we have to map the children of the horizontal-menu components to the vertical-menu components.
 * We also kept the same names and almost similar props for menuitem and submenu components for easy mapping.
 */

/**
 * Processes children of a HorizontalMenu component to either generate a vertical menu directly
 * from menuData or apply a transformation function to each child.
 */
const processMenuChildren = (children: ReactNode, mapFunction: (child: ReactNode) => ReactNode): ReactNode => {
  return Children.map(children, child => {
    // Skip processing for non-React elements
    if (!isValidElement<{ menuData?: unknown[] }>(child)) return child

    // 방어: props가 없을 수 있음
    if (!child.props) return child

    // If child has menuData prop, create a GenerateVerticalMenu component
    return child.props.menuData ? <GenerateVerticalMenu menuData={child.props.menuData as never} /> : mapFunction(child)
  })
}

/**
 * Transforms a hierarchy of horizontal menu components (HorizontalMenuItem,
 * HorizontalSubMenu, and HorizontalMenu) into their vertical equivalents.
 *
 * [수정 2026-04-28] React 19 + Next.js 16 RSC 직렬화 환경에서
 * child.type이 undefined인 경우 방어 코드 추가
 */
export const mapHorizontalToVerticalMenu = (children: ReactNode): ReactNode => {
  return Children.map(children, child => {
    if (!child) {
      return null
    }

    // If the child is not a valid React element, exclude it from the output
    if (
      !isValidElement<{ children?: ReactNode; verticalMenuProps?: Record<string, unknown>; [key: string]: unknown }>(
        child
      )
    )
      return null

    // 방어: child.type 또는 child.props가 undefined인 경우 (RSC 직렬화 / React 19)
    if (!child.type || !child.props) return child

    // Destructure to separate specific props and rest props for further use
    const { children: childChildren, verticalMenuProps, ...rest } = child.props

    // Use a switch statement to handle different types of menu items
    switch (child.type) {
      case HorizontalMenuItem:
        // Directly transform HorizontalMenuItem to VerticalMenuItem
        return <VerticalMenuItem {...rest}>{childChildren}</VerticalMenuItem>
      case HorizontalSubMenu:
        // Transform HorizontalSubMenu to VerticalSubMenu, recursively transforming its children
        return (
          <VerticalSubMenu {...(rest as unknown as Parameters<typeof VerticalSubMenu>[0])}>
            {mapHorizontalToVerticalMenu(childChildren)}
          </VerticalSubMenu>
        )
      case HorizontalMenu:
        // For HorizontalMenu, process its children specifically, then wrap in VerticalMenu
        const transformedChildren = processMenuChildren(childChildren, mapHorizontalToVerticalMenu)

        return <VerticalMenu {...(verticalMenuProps || {})}>{transformedChildren}</VerticalMenu>
      default:
        // For any other type of child, return it without modification
        return child
    }
  })
}

/*
 * Render all the icons for Menu Item and SubMenu components for all the levels more than 0
 */
export const renderMenuIcon = (params: RenderMenuIconParams) => {
  const { icon, level, active, disabled, styles, renderExpandedMenuItemIcon, isBreakpointReached } = params

  if (icon && (level === 0 || (!isBreakpointReached && level && level > 0))) {
    return (
      <StyledMenuIcon className={menuClasses.icon} rootStyles={styles}>
        {icon}
      </StyledMenuIcon>
    )
  }

  if (
    level &&
    level !== 0 &&
    renderExpandedMenuItemIcon &&
    renderExpandedMenuItemIcon.icon !== null &&
    (!renderExpandedMenuItemIcon.level || renderExpandedMenuItemIcon.level >= level)
  ) {
    const iconToRender =
      typeof renderExpandedMenuItemIcon.icon === 'function'
        ? renderExpandedMenuItemIcon.icon({ level, active, disabled })
        : renderExpandedMenuItemIcon.icon

    if (iconToRender) {
      return (
        <StyledMenuIcon className={menuClasses.icon} rootStyles={styles}>
          {iconToRender}
        </StyledMenuIcon>
      )
    }
  }

  return null
}
