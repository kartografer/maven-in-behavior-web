import { Router } from '@angular/router'
import { RouterTestingModule } from '@angular/router/testing'
import { routes } from './app-routing.module'
import { TestBed } from '@angular/core/testing'
import { FormsModule } from '@angular/forms'
import { AppComponent } from './app.component'
import {
  WebsiteContent,
  WebsiteContentService,
} from './website-content.service'

const content = (): WebsiteContent => ({
  heroText: 'Family-centered care',
  aboutText: 'Maven in Behavior',
  insuranceText: '',
  contactText: '',
  contactEmail: '',
  staff: [
    {
      id: 'one',
      name: 'First person',
      photo: 'assets/img/alana.jpg',
      photoX: 20,
      photoY: 30,
    },
    { id: 'two', name: 'Second person' },
  ],
  services: [{ id: 'therapy', name: 'ABA therapy' }],
  insurance: [{ id: 'aetna', name: 'Aetna' }],
})

describe('Maven website editor', () => {
  let website: jasmine.SpyObj<WebsiteContentService>
  beforeEach(async () => {
    website = jasmine.createSpyObj('WebsiteContentService', [
      'load',
      'loadPublished',
      'signIn',
      'signOut',
      'update',
      'uploadPhoto',
    ])
    website.load.and.resolveTo(content())
    website.loadPublished.and.resolveTo(null)
    website.signIn.and.resolveTo()
    website.signOut.and.resolveTo()
    website.update.and.callFake(async (current, change) => {
      const next = structuredClone(current)
      change(next)
      return next
    })
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule.withRoutes(routes)],
      declarations: [AppComponent],
      providers: [{ provide: WebsiteContentService, useValue: website }],
    }).compileComponents()
  })
  async function setup(cms = true) {
    await TestBed.inject(Router).navigateByUrl(cms ? '/cms' : '/')
    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    return fixture
  }
  it('loads profiles without showing editing controls or removed content', async () => {
    const fixture = await setup(false)
    expect(fixture.nativeElement.querySelector('button.edit')).toBeNull()
    expect(
      fixture.nativeElement.querySelectorAll('#staff-list article').length
    ).toBe(2)
    expect(fixture.nativeElement.textContent).not.toContain(
      'Small steps. A meaningful beginning.'
    )
    expect(fixture.nativeElement.textContent).not.toContain(
      'Discover how we can help'
    )
    expect(fixture.nativeElement.textContent).not.toContain(
      'Thoughtful support'
    )
    expect(fixture.componentInstance.editing).toBeFalse()
    expect(fixture.nativeElement.querySelector('.adminbar')).toBeNull()
  })
  it('shows the edit button only on /cms and still requires sign-in', async () => {
    const fixture = await setup()
    expect(fixture.nativeElement.querySelector('button.edit')).not.toBeNull()
    expect(fixture.componentInstance.editing).toBeFalse()
    expect(website.signIn).not.toHaveBeenCalled()
    await fixture.componentInstance.startEditing()
    fixture.detectChanges()
    expect(website.signIn).toHaveBeenCalledTimes(1)
    expect(fixture.nativeElement.querySelector('.adminbar')).not.toBeNull()
    await TestBed.inject(Router).navigateByUrl('/')
    fixture.detectChanges()
    expect(fixture.componentInstance.editing).toBeFalse()
    expect(fixture.nativeElement.querySelector('button.edit')).toBeNull()
    expect(fixture.nativeElement.querySelector('.adminbar')).toBeNull()
  })
  it('does not start sign-in from the public homepage', async () => {
    const fixture = await setup(false)
    await fixture.componentInstance.startEditing()
    expect(website.signIn).not.toHaveBeenCalled()
    expect(fixture.componentInstance.editing).toBeFalse()
  })
  it('does not unlock editing when sign-in is denied', async () => {
    const app = (await setup()).componentInstance
    website.signIn.and.rejectWith(new Error('Wrong account'))
    await app.startEditing()
    expect(app.editing).toBeFalse()
    expect(app.error).toBe('Wrong account')
  })
  it('saves crop positions for one profile without replacing other sections', async () => {
    const app = (await setup()).componentInstance
    await app.startEditing()
    app.editItem('staff', app.content.staff[0])
    app.draft.photoX = 70
    app.draft.photoY = 10
    await app.save()
    expect(app.content.staff[0].photoX).toBe(70)
    expect(app.content.staff[0].photoY).toBe(10)
    expect(app.content.staff[1].name).toBe('Second person')
    expect(app.content.services[0].name).toBe('ABA therapy')
  })
  it('removes only the selected staff member', async () => {
    const app = (await setup()).componentInstance
    await app.startEditing()
    spyOn(window, 'confirm').and.returnValue(true)
    await app.deleteItem('staff', app.content.staff[0])
    expect(app.content.staff.map((item) => item.id)).toEqual(['two'])
    expect(app.content.insurance.length).toBe(1)
  })
  it('centers and clamps photo positions', async () => {
    const app = (await setup()).componentInstance
    app.draft = { id: 'one', name: 'Test', photoX: 10, photoY: 90 }
    app.centerPhoto()
    expect(app.photoPosition(app.draft)).toBe('50% 50%')
    expect(
      app.photoPosition({ id: 'one', name: 'Test', photoX: -30, photoY: 120 })
    ).toBe('0% 100%')
  })
  it('adds a service and removes a photo independently', async () => {
    const app = (await setup()).componentInstance
    await app.startEditing()
    app.editItem('services')
    app.draft.name = 'Consultation'
    await app.save()
    expect(app.content.services.length).toBe(2)
    app.editItem('staff', app.content.staff[0])
    app.removePhoto()
    await app.save()
    expect(app.content.staff[0].photo).toBe('')
    expect(app.content.staff.length).toBe(2)
  })
})
