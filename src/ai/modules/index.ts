import { aiRegistry } from '../registry';
import { marketplaceModule } from './marketplace.module';
import { adoptionModule } from './adoption.module';
import { lostPetsModule } from './lostPets.module';
import { providerCatalogModule } from './providerCatalog.module';
import {
  petsModule,
  sheltersModule,
  ordersModule,
  breedingModule,
} from './pets.module';
import { exerciseModule } from './exercise.module';
import { nutritionModule } from './nutrition.module';
import { veterinaryModule } from './veterinary.module';
import { remindersModule } from './reminders.module';
import { settingsModule } from './settings.module';
import { healthModule } from './health.module';
import { memoryModule } from './memory.module';
import { bookingsModule } from './bookings.module';
import { cartModule } from './cart.module';
import { briefingModule } from './briefing.module';

let initialized = false;

/** Register all AI modules. Safe to call multiple times. */
export function initAiModules() {
  if (initialized) return;
  [
    marketplaceModule,
    adoptionModule,
    lostPetsModule,
    petsModule,
    sheltersModule,
    ordersModule,
    breedingModule,
    providerCatalogModule,
    exerciseModule,
    nutritionModule,
    veterinaryModule,
    remindersModule,
    settingsModule,
    healthModule,
    memoryModule,
    bookingsModule,
    cartModule,
    briefingModule,
  ].forEach((m) => aiRegistry.register(m));
  initialized = true;
}

export {
  marketplaceModule,
  adoptionModule,
  lostPetsModule,
  petsModule,
  sheltersModule,
  ordersModule,
  breedingModule,
  providerCatalogModule,
  exerciseModule,
  nutritionModule,
  veterinaryModule,
  remindersModule,
  settingsModule,
  healthModule,
  memoryModule,
  bookingsModule,
  cartModule,
  briefingModule,
};

/**
 * To add a new module:
 * 1. Create src/ai/modules/yourModule.module.ts exporting AiModuleDefinition
 * 2. Import and register it in initAiModules() above
 * 3. Add keywords in Spanish for the local router
 */
