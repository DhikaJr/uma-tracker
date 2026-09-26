<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCareerRunRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uma_name' => ['required', 'string', 'max:255'],
            'scenario' => ['required', 'string', 'max:255'],
            'training_type' => ['nullable', 'string', 'in:manual,independent'],
            'fans_gained' => ['required', 'integer', 'min:0'],
            'evaluation_score' => ['nullable', 'integer', 'min:0'],
            'starting_fans' => ['nullable', 'integer', 'min:0'],
            'ending_fans' => ['nullable', 'integer'],
            'final_rank' => ['sometimes', 'required', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'run_date' => ['required', 'date', 'before_or_equal:today'],
        ];
    }
}
