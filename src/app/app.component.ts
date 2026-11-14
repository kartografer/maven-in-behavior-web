import { NavigationEnd, Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core'
import {
  Section,
  TextKey,
  WebsiteContent,
  WebsiteContentService,
  WebsiteItem,
} from './website-content.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  @ViewChild('editor') editor?: ElementRef<HTMLDialogElement>
  private website = inject(WebsiteContentService)
  private router = inject(Router)
  private destroyRef = inject(DestroyRef)

  get isCmsRoute() {
    return this.router.url.split(/[?#]/)[0].replace(/\/$/, '') === '/cms'
  }
  content: WebsiteContent = {
    heroText: '',
    aboutText: '',
    insuranceText: '',
    contactText: '',
    contactEmail: '',
    staff: [],
    services: [],
    insurance: [],
  }
  editing = false
  signingIn = false
  saving = false
  status = ''
  error = ''
  dialogStatus = ''
  year = new Date().getFullYear()
  section: Section = 'staff'
  textKey: TextKey | null = null
  textValue = ''
  draft: WebsiteItem = { id: '', name: '', photoX: 50, photoY: 50 }
  preview = ''
  previewRatio = '618 / 864'
  private file?: File

  async ngOnInit() {
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event instanceof NavigationEnd && !this.isCmsRoute) {
          this.editing = false
          this.error = ''
          this.closeEditor()
        }
      })
    try {
      this.content = await this.website.load()
      // Render the snapshot immediately while checking for saved cloud changes.
      const published = await this.website.loadPublished()
      if (published && !this.editing && !this.signingIn)
        this.content = published
    } catch {
      this.error = 'Unable to load the website. Please refresh.'
    }
  }
  async startEditing() {
    if (!this.isCmsRoute || this.signingIn) return
    this.error = ''
    this.signingIn = true
    try {
      await this.website.signIn()
      const published = await this.website.loadPublished()
      if (published) this.content = published
      this.editing = this.isCmsRoute
    } catch (error) {
      this.error = this.message(error)
    } finally {
      this.signingIn = false
    }
  }
  async finishEditing() {
    try {
      await this.website.signOut()
      this.editing = false
    } catch (error) {
      this.error = this.message(error)
    }
  }
  editText(key: TextKey) {
    if (!this.editing) return
    this.textKey = key
    this.textValue = this.content[key]
    this.openEditor()
  }
  editItem(section: Section, item?: WebsiteItem) {
    if (!this.editing) return
    this.textKey = null
    this.section = section
    this.draft = item
      ? { ...item, photoX: item.photoX ?? 50, photoY: item.photoY ?? 50 }
      : {
          id: '',
          name: '',
          role: '',
          description: '',
          photo: '',
          photoX: 50,
          photoY: 50,
        }
    const portrait = document
      .querySelector('#staff-list .portrait')
      ?.getBoundingClientRect()
    this.previewRatio =
      portrait?.width && portrait?.height
        ? `${portrait.width} / ${portrait.height}`
        : '618 / 864'
    this.openEditor()
  }
  private openEditor() {
    this.clearPreview()
    this.dialogStatus = ''
    this.editor?.nativeElement.showModal()
  }
  closeEditor() {
    this.editor?.nativeElement.close()
    this.clearPreview()
  }
  clearPreview() {
    if (this.preview) URL.revokeObjectURL(this.preview)
    this.preview = ''
    this.file = undefined
  }
  selectPhoto(event: Event) {
    this.clearPreview()
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.dialogStatus = 'Choose a JPEG, PNG, or WebP photo under 5 MB.'
      ;(event.target as HTMLInputElement).value = ''
      return
    }
    this.dialogStatus = ''
    this.file = file
    this.preview = URL.createObjectURL(file)
  }
  centerPhoto() {
    this.draft.photoX = 50
    this.draft.photoY = 50
  }
  removePhoto() {
    this.clearPreview()
    this.draft.photo = ''
    const input =
      this.editor?.nativeElement.querySelector<HTMLInputElement>(
        'input[type=file]'
      )
    if (input) input.value = ''
  }
  /**
   * photoX/photoY mark the focal point (e.g. the face) as a percentage of the
   * photo. styles.scss keeps that point centered in the portrait box, clamped
   * to the photo's edges, so the crop adapts to every box size.
   */
  photoFocus(item: WebsiteItem) {
    return {
      '--focus-x': this.position(item.photoX) / 100,
      '--focus-y': this.position(item.photoY) / 100,
    }
  }
  /** Records the photo's height/width ratio for the focal-point crop math. */
  photoLoaded(event: Event) {
    const img = event.target as HTMLImageElement
    if (img.naturalWidth)
      img.style.setProperty(
        '--photo-ratio',
        String(img.naturalHeight / img.naturalWidth)
      )
  }
  private position(value?: number) {
    return value == null || !Number.isFinite(Number(value))
      ? 50
      : Math.max(0, Math.min(100, Number(value)))
  }
  async save() {
    if (!this.isCmsRoute || this.saving || !this.editing) return
    this.saving = true
    this.dialogStatus = 'Saving…'
    try {
      if (this.textKey) {
        const key = this.textKey,
          value = this.textValue.trim()
        if (
          key === 'contactEmail' &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        )
          throw new Error('Enter a valid email address.')
        this.content = await this.website.update(this.content, (next) => {
          next[key] = value
        })
      } else {
        const section = this.section
        const item = {
          ...this.draft,
          name: this.draft.name.trim(),
          photoX: this.position(this.draft.photoX),
          photoY: this.position(this.draft.photoY),
        }
        if (!item.name) throw new Error('Name is required.')
        if (this.file) {
          item.photo = await this.website.uploadPhoto(this.file)
          this.draft.photo = item.photo
          this.clearPreview()
        }
        const existingId = item.id
        item.id ||= crypto.randomUUID()
        this.content = await this.website.update(this.content, (next) => {
          const index = next[section].findIndex(
            (value) => value.id === existingId
          )
          if (existingId && index < 0)
            throw new Error('This item was removed. Refresh and try again.')
          if (index < 0) next[section].push(item)
          else next[section][index] = item
        })
      }
      this.closeEditor()
      this.status = 'Saved online'
    } catch (error) {
      this.dialogStatus = this.message(error)
    } finally {
      this.saving = false
    }
  }
  async deleteItem(section: Section, item: WebsiteItem) {
    if (
      !this.editing ||
      !confirm(`Delete ${item.name}? Only this item will be removed.`)
    )
      return
    try {
      this.content = await this.website.update(this.content, (next) => {
        next[section] = next[section].filter((value) => value.id !== item.id)
      })
      this.status = 'Item deleted'
    } catch (error) {
      this.error = this.message(error)
    }
  }
  private message(error: unknown) {
    const code = (error as { code?: string })?.code || ''
    if (code.includes('permission-denied') || code.includes('unauthorized'))
      return 'Editing is not authorized. Check the Google account and Firebase security rules.'
    if (code.includes('operation-not-allowed'))
      return 'Google sign-in must be enabled in Firebase Authentication.'
    if (code.includes('popup-closed'))
      return 'Sign-in was closed. Click Edit website to try again.'
    return error instanceof Error
      ? error.message
      : 'Unable to save. Please try again.'
  }
}
