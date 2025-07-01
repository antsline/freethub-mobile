// 開発用のモックSupabaseクライアント
// 実際のSupabaseが設定されるまでの一時的な実装

const mockSupabaseClient = {
  from: (table: string) => ({
    select: (query?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: { message: 'Supabaseが設定されていません' } }),
        limit: (limit: number) => Promise.resolve({ data: [], error: null }),
        order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
        gte: (column: string, value: any) => ({
          lte: (column: string, value: any) => ({
            order: (column: string) => Promise.resolve({ data: [], error: null })
          })
        })
      }),
      ilike: (column: string, pattern: string) => ({
        limit: (limit: number) => Promise.resolve({ data: [], error: null })
      })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { message: 'Supabaseが設定されていません' } })
      })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: { message: 'Supabaseが設定されていません' } })
    })
  })
};

export const supabase = mockSupabaseClient as any;