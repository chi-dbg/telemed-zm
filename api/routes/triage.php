<?php
/**
 * Symptom triage scoring (FR-S-05).
 *
 * Rule-based red-flag scorer. Inspired by virtual-triage principles
 * (Gellert et al. 2023; Salman et al. 2024 - TeleMedQuick) but kept
 * simple and decision-supportive: it flags risk; the doctor still decides.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

/**
 * Red-flag dictionary. Each symptom carries a severity weight.
 * Score interpretation:
 *   0-2  routine   - safe for remote prescription
 *   3-5  review    - doctor should review carefully
 *   >=6  refer     - high risk, recommend in-person referral
 */
const RED_FLAGS = [
    // High-severity (refer)
    'chest_pain'                => 5,
    'shortness_of_breath'       => 5,
    'severe_abdominal_pain'     => 4,
    'unexplained_bleeding'      => 5,
    'loss_of_consciousness'     => 6,
    'severe_headache_sudden'    => 5,
    'jaundice'                  => 4,
    'severe_dehydration'        => 4,
    'altered_mental_state'      => 6,
    'high_fever_above_39'       => 3,

    // Medium
    'persistent_vomiting'       => 3,
    'persistent_diarrhoea'      => 3,
    'rash_with_fever'           => 3,
    'severe_pain_unrelieved'    => 3,
    'pregnancy_complications'   => 4,

    // Low (routine)
    'mild_fever'                => 1,
    'cough'                     => 1,
    'sore_throat'               => 1,
    'runny_nose'                => 1,
    'mild_headache'             => 1,
    'fatigue'                   => 1,
    'mild_diarrhoea'            => 1,
    'minor_skin_rash'           => 1,
    'muscle_ache'               => 1,
];

function triage_score(): void
{
    require_auth(); // any authenticated user can score
    $data = read_json();
    $symptoms = $data['symptoms'] ?? [];
    $duration_days = (int) ($data['duration_days'] ?? 0);

    if (!is_array($symptoms)) {
        send_json(['error' => 'symptoms must be an array of keys'], 400);
    }

    $score = 0;
    $matched = [];
    foreach ($symptoms as $key) {
        $key = strtolower(trim((string) $key));
        if (isset(RED_FLAGS[$key])) {
            $score += RED_FLAGS[$key];
            $matched[] = ['key' => $key, 'weight' => RED_FLAGS[$key]];
        }
    }
    // Long-duration low-grade symptoms also raise the score
    if ($duration_days >= 7 && $score < 3) {
        $score += 1;
    }

    if ($score >= 6)      $rec = 'refer';
    elseif ($score >= 3)  $rec = 'review';
    else                  $rec = 'routine';

    $messages = [
        'routine' => 'Symptoms appear suitable for a remote consultation and possible e-prescription.',
        'review'  => 'Doctor should review the case carefully; remote prescription possible with caution.',
        'refer'   => 'Red-flag symptoms detected. Recommend in-person referral for physical examination and tests.',
    ];

    send_json([
        'score'           => $score,
        'recommendation'  => $rec,
        'message'         => $messages[$rec],
        'matched'         => $matched,
        'red_flag_catalog'=> array_keys(RED_FLAGS),
    ]);
}
