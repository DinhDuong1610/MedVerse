import { apiRequest } from '@/lib/api/http';

export type Medication = {
    id: string;
    code: string;
    name: string;
    activeIngredient?: string;
    atcCode?: string;
    unit?: string;
};

export async function searchMedications(keyword = '') {
    const res = await apiRequest<{
        content: Medication[];
    }>(`/v1/medications?keyword=${encodeURIComponent(keyword)}&size=20`);

    return res.data.content || [];
}