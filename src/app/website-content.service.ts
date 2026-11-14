import { inject, Injectable } from '@angular/core'
import { FirebaseApp } from '@angular/fire/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, getFirestore, runTransaction } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export type Section = 'staff' | 'services' | 'insurance'
export type TextKey =
  | 'heroText'
  | 'aboutText'
  | 'insuranceText'
  | 'contactText'
  | 'contactEmail'
export interface WebsiteItem {
  id: string
  name: string
  role?: string
  description?: string
  photo?: string
  photoX?: number
  photoY?: number
}
export interface WebsiteContent {
  heroText: string
  aboutText: string
  insuranceText: string
  contactText: string
  contactEmail: string
  staff: WebsiteItem[]
  services: WebsiteItem[]
  insurance: WebsiteItem[]
}

@Injectable({ providedIn: 'root' })
export class WebsiteContentService {
  private app = inject(FirebaseApp)
  private get contentRef() {
    return doc(getFirestore(this.app), 'website', 'content')
  }

  async load(): Promise<WebsiteContent> {
    const response = await fetch('assets/website-content.json')
    if (!response.ok) throw new Error('Website content could not be loaded.')
    return response.json()
  }
  async loadPublished(): Promise<WebsiteContent | null> {
    try {
      const snapshot = await getDoc(this.contentRef)
      return snapshot.exists() ? (snapshot.data() as WebsiteContent) : null
    } catch {
      // The bundled snapshot keeps the public site usable before Firebase setup.
      return null
    }
  }
  async signIn(): Promise<void> {
    const auth = getAuth(this.app)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const { user } = await signInWithPopup(auth, provider)
    const email = user.email || 'this Google account'
    if (!user.emailVerified) {
      await signOut(auth)
      throw new Error(
        `${email} has not been verified by Google. Please use the authorized Google account.`
      )
    }
    // Editors are listed in the Firestore `editors` collection (managed in the
    // Firebase console). The older websiteEditor custom claim is still honored.
    const token = await user.getIdTokenResult(true)
    if (
      token.claims['websiteEditor'] !== true &&
      !(await this.isListedEditor(user.email))
    ) {
      await signOut(auth)
      throw new Error(
        `${email} is signed in but is not on the website editor list. Sign in with an authorized account, or ask the site administrator to add this email to the editors list.`
      )
    }
    // Verify backend availability before exposing editing controls.
    await getDoc(this.contentRef)
  }
  /** True when `editors/<lowercase email>` exists. Rules let users read only their own entry. */
  private async isListedEditor(email: string | null): Promise<boolean> {
    if (!email) return false
    try {
      const entry = doc(getFirestore(this.app), 'editors', email.toLowerCase())
      return (await getDoc(entry)).exists()
    } catch {
      return false
    }
  }
  async signOut(): Promise<void> {
    await signOut(getAuth(this.app))
  }
  async update(
    current: WebsiteContent,
    change: (next: WebsiteContent) => void
  ): Promise<WebsiteContent> {
    return runTransaction(getFirestore(this.app), async (transaction) => {
      const snapshot = await transaction.get(this.contentRef)
      const next: WebsiteContent = structuredClone(
        snapshot.exists() ? (snapshot.data() as WebsiteContent) : current
      )
      change(next)
      transaction.set(this.contentRef, next)
      return next
    })
  }
  async uploadPhoto(file: File): Promise<string> {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      throw new Error('Choose a JPEG, PNG, or WebP photo under 5 MB.')
    }
    const photo = ref(
      getStorage(this.app),
      'staff-photos/' + crypto.randomUUID()
    )
    await uploadBytes(photo, file, { contentType: file.type })
    return getDownloadURL(photo)
  }
}
