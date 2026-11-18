import { Module } from '@nestjs/common';
import { PagesController } from './pages/pages.controller';
import { PagesService } from './pages/pages.service';
import { SectionsController } from './sections/sections.controller';
import { SectionsService } from './sections/sections.service';
import { BlogsController } from './blogs/blogs.controller';
import { BlogsService } from './blogs/blogs.service';
import { CategoriesController, CategoriesService } from './categories/categories.controller';
import { FormsController } from './forms/forms.controller';
import { FormsService } from './forms/forms.service';
import { LeadsController } from './leads/leads.controller';
import { LeadsService } from './leads/leads.service';
import { SocialController, SocialService } from './social/social';
import { SeoController, SeoService } from './seo/seo';
import { MediaController, MediaService } from './media/media';
import { MediaStorage } from './media/storage';

@Module({
  controllers: [
    PagesController,
    SectionsController,
    BlogsController,
    CategoriesController,
    FormsController,
    LeadsController,
    SocialController,
    SeoController,
    MediaController,
  ],
  providers: [
    PagesService,
    SectionsService,
    BlogsService,
    CategoriesService,
    FormsService,
    LeadsService,
    SocialService,
    SeoService,
    MediaService,
    MediaStorage,
  ],
})
export class CmsModule {}
