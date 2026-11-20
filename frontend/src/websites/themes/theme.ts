import type { ComponentType, ReactNode } from 'react';
import type { SectionType } from '@/lib/types';
import type { NavItem, PublicPost, PublicSocial } from '../data';
import type { Obj } from '../kit';

/** What a website theme provides. Every section type must render in every theme. */
export interface ThemeModule {
  /** Google Fonts stylesheet URL */
  fonts: string;
  Layout: ComponentType<{
    nav: NavItem[];
    social: PublicSocial[];
    overlayHeader: boolean;
    children: ReactNode;
  }>;
  Section: ComponentType<{ type: SectionType; content: Obj }>;
  PostView: ComponentType<{ post: PublicPost }>;
  Message: ComponentType<{ title: string; body?: string }>;
}
