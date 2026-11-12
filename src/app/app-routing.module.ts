import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: 'cms', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
]

@NgModule({
  imports: [RouterModule.forRoot(routes, {})],
  exports: [RouterModule],
})
export class AppRoutingModule {}
