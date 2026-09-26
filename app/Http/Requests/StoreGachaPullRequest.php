<?php

namespace App\Http\Requests;

use App\Models\GachaBanner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreGachaPullRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'banner_type' => ['required', 'string', 'in:character,support_card'],
            'gacha_banner_id' => ['required', 'integer', 'exists:gacha_banners,id'],
            'pull_type' => ['required', 'string', 'in:single,multi_10,ticket,custom_ticket'],
            'item_name' => ['required', 'string', 'max:255'],
            'rarity' => ['required', 'string', 'in:R,SR,SSR'],
            'is_rate_up' => ['nullable', 'boolean'],
            'pulled_at' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'gacha_banner_id.required' => 'Kolom Banner JP 2026 wajib dipilih. Tarikan tanpa banner tidak dapat diinput.',
            'gacha_banner_id.exists' => 'Banner JP 2026 yang dipilih tidak ditemukan.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $isRateUp = filter_var($this->input('is_rate_up'), FILTER_VALIDATE_BOOLEAN);
            if (! $isRateUp) {
                return;
            }

            $rarity = (string) $this->input('rarity');
            if ($rarity === 'R') {
                $validator->errors()->add('is_rate_up', 'Kartu dengan rarity R tidak dapat dijadikan rate-up.');

                return;
            }

            $bannerId = $this->input('gacha_banner_id');
            if ($bannerId) {
                $banner = GachaBanner::find($bannerId);
                $itemName = (string) $this->input('item_name');
                if ($banner && ! $banner->isItemRateUp($itemName)) {
                    $bannerName = $banner->name;
                    $validator->errors()->add('is_rate_up', "Kartu '{$itemName}' bukan merupakan pilihan rate-up pada banner '{$bannerName}'.");
                }
            }
        });
    }
}
