import type { LucideIcon } from 'lucide-react';
import {
    Coffee,
    Cookie,
    CupSoda,
    Drumstick,
    GlassWater,
    Salad,
    Sandwich,
    Soup,
    UtensilsCrossed,
} from 'lucide-react';

export type MenuCategory = 'entradas' | 'platos' | 'bebidas' | 'postres';

export type MenuItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    category: MenuCategory;
    icon: LucideIcon;
};

export const MENU_CATEGORIES: { id: MenuCategory; label: string }[] = [
    { id: 'entradas', label: 'Entradas' },
    { id: 'platos', label: 'Platos' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'postres', label: 'Postres' },
];

export const MENU_ITEMS: MenuItem[] = [
    {
        id: 'nachos',
        name: 'Nachos escolares',
        description: 'Totopos, queso y pico de gallo',
        price: 45,
        category: 'entradas',
        icon: UtensilsCrossed,
    },
    {
        id: 'sopa',
        name: 'Sopa del día',
        description: 'Caldo casero con verduras',
        price: 35,
        category: 'entradas',
        icon: Soup,
    },
    {
        id: 'ensalada',
        name: 'Ensalada fresca',
        description: 'Lechuga, tomate y aderezo',
        price: 40,
        category: 'entradas',
        icon: Salad,
    },
    {
        id: 'hamburguesa',
        name: 'Hamburguesa clásica',
        description: 'Carne, queso, lechuga y papas',
        price: 85,
        category: 'platos',
        icon: Sandwich,
    },
    {
        id: 'taco',
        name: 'Tacos al pastor',
        description: 'Orden de 3 con cilantro y piña',
        price: 70,
        category: 'platos',
        icon: UtensilsCrossed,
    },
    {
        id: 'pasta',
        name: 'Pasta boloñesa',
        description: 'Spaghetti con salsa de tomate',
        price: 75,
        category: 'platos',
        icon: UtensilsCrossed,
    },
    {
        id: 'pollo',
        name: 'Pollo empanizado',
        description: 'Con arroz y ensalada',
        price: 80,
        category: 'platos',
        icon: Drumstick,
    },
    {
        id: 'agua',
        name: 'Agua de sabor',
        description: 'Jamaica, horchata o limón',
        price: 20,
        category: 'bebidas',
        icon: GlassWater,
    },
    {
        id: 'refresco',
        name: 'Refresco',
        description: 'Lata 355 ml',
        price: 25,
        category: 'bebidas',
        icon: CupSoda,
    },
    {
        id: 'cafe',
        name: 'Café americano',
        description: 'Taza caliente',
        price: 22,
        category: 'bebidas',
        icon: Coffee,
    },
    {
        id: 'flan',
        name: 'Flan napolitano',
        description: 'Porción individual',
        price: 30,
        category: 'postres',
        icon: Cookie,
    },
    {
        id: 'brownie',
        name: 'Brownie',
        description: 'Con nuez y chocolate',
        price: 35,
        category: 'postres',
        icon: Cookie,
    },
];

export function formatPrice(amount: number) {
    return `$${amount.toFixed(2)}`;
}
