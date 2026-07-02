import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { resolveProductForCart } from '../helpers/cartActions';

export const cartModule: AiModuleDefinition = {
  id: 'cart',
  name: 'Carrito',
  description: 'Agregar productos al carrito de compras',
  basePath: '/cart',
  tools: [
    {
      name: 'cart_add_item',
      description:
        'Agrega un PRODUCTO de la tienda al carrito del usuario. Usar cuando diga "agrégalo al carrito", "quiero comprarlo", "añade al carrito" después de buscar un producto. Requiere confirmación.',
      keywords: [
        'agregar al carrito',
        'agrégalo al carrito',
        'agregalo al carrito',
        'añadir al carrito',
        'añádelo al carrito',
        'ponlo en el carrito',
        'quiero comprarlo',
        'lo compro',
        'agrega al carrito',
      ],
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string', description: 'Nombre del producto' },
          quantity: { type: 'number', description: 'Cantidad (default 1)' },
        },
        required: ['product_name'],
        additionalProperties: false,
      },
      execute: async (
        params: { product_name: string; quantity?: number },
        ctx: AiExecutionContext,
      ) => {
        if (!ctx.userId) {
          return { error: 'AUTH_REQUIRED', message: 'Debes iniciar sesión para usar el carrito.' };
        }

        const quantity = Math.min(Math.max(params.quantity ?? 1, 1), 99);
        const result = await resolveProductForCart(params.product_name, quantity);
        if ('error' in result) {
          return { error: 'NOT_FOUND', message: result.error };
        }

        return {
          success: true,
          cart_action: { action: 'add', item: result.cartItem },
          product_name: result.cartItem.name,
          quantity,
          price: result.cartItem.price,
          currency: result.cartItem.currency,
        };
      },
    },
  ],
};
