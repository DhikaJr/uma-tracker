<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BulkDeleteRequest extends FormRequest
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
            'ids.required' => 'Daftar ID data yang ingin dihapus wajib disertakan.',
            'ids.array' => 'Format daftar ID harus berupa array.',
            'ids.min' => 'Pilih minimal satu data untuk dihapus.',
            'ids.*.required' => 'ID data tidak boleh kosong.',
            'ids.*.integer' => 'Setiap ID harus berupa bilangan bulat.',
        ];
    }
}
