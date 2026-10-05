<?php

namespace App\Http\Requests;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateGachaPullRequest extends FormRequest
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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'banner_type' => ['sometimes', 'required', 'string', 'in:character,support_card'],
            'gacha_banner_id' => ['sometimes', 'required', 'integer', 'exists:gacha_banners,id'],
            'pull_type' => ['sometimes', 'required', 'string', 'in:single,multi_10,ticket,custom_ticket'],
            'item_name' => ['sometimes', 'required', 'string', 'max:255'],
            'rarity' => ['sometimes', 'required', 'string', 'in:R,SR,SSR'],
            'is_rate_up' => ['nullable', 'boolean'],
            'pulled_at' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $bannerId = $this->input('gacha_banner_id');
        if (! $bannerId) {
            $pullId = $this->route('id') ?? $this->route('pull');
            $pull = $pullId ? GachaPull::find($pullId) : null;
            $bannerId = $pull?->gacha_banner_id;
        }

        if ($bannerId) {
            $banner = GachaBanner::find($bannerId);
            if ($banner && $banner->isTwinkle()) {
                $this->merge(['is_rate_up' => false]);
            }
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $pullId = $this->route('id') ?? $this->route('pull');
            $pull = $pullId ? GachaPull::find($pullId) : null;

            $isRateUp = $this->has('is_rate_up')
                ? filter_var($this->input('is_rate_up'), FILTER_VALIDATE_BOOLEAN)
                : (bool) ($pull?->is_rate_up);

            if (! $isRateUp) {
                return;
            }

            $rarity = (string) ($this->input('rarity') ?? $pull?->rarity ?? '');
            if ($rarity === 'R') {
                $validator->errors()->add('is_rate_up', 'Kartu dengan rarity R tidak dapat dijadikan rate-up.');

                return;
            }

            $bannerId = $this->input('gacha_banner_id') ?? $pull?->gacha_banner_id;
            $itemName = (string) ($this->input('item_name') ?? $pull?->item_name ?? '');

            if ($bannerId) {
                $banner = GachaBanner::find($bannerId);
                if ($banner && ! $banner->isItemRateUp($itemName)) {
                    $bannerName = $banner->name;
                    $validator->errors()->add('is_rate_up', "Kartu '{$itemName}' bukan merupakan pilihan rate-up pada banner '{$bannerName}'.");
                }
            }
        });
    }
}
