<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateGachaPullRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'min:1'],
            'pull_type' => ['nullable', 'string', 'in:single,multi_10,ticket,custom_ticket'],
            'gacha_banner_id' => ['nullable', 'integer', 'exists:gacha_banners,id'],
            'pulled_at' => ['nullable', 'date'],
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ids.required' => 'Daftar ID data yang ingin diubah wajib disertakan.',
            'ids.array' => 'Format daftar ID harus berupa array.',
            'ids.min' => 'Pilih minimal satu data untuk diubah.',
            'ids.*.required' => 'ID data tidak boleh kosong.',
            'ids.*.integer' => 'Setiap ID harus berupa bilangan bulat.',
            'pull_type.in' => 'Tipe pull harus salah satu dari: single, multi_10, ticket, atau custom_ticket.',
            'gacha_banner_id.exists' => 'Banner gacha yang dipilih tidak ditemukan dalam basis data.',
            'pulled_at.date' => 'Format tanggal pull tidak valid.',
        ];
    }
}
