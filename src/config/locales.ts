export { locales };

/**
 * All `d3-format` locales that we ideally need to support Power BI.
 *
 * [DEBT] We will need to create (or assign) the following to support all Power BI locales:
 *
 * - bg-BG
 * - da-DK
 * - el-GR
 * - et-EE
 * - eU-ES
 * - gl-ES
 * - hi-IN
 * - hr-HR
 * - id-ID
 * - kk-KZ
 * - lt-LT
 * - lv-LV
 * - ms-MY
 * - nb-NO
 * - pt-PT
 * - ro-RO
 * - sk-SK
 * - sl-SI
 * - sr-Cyrl-RS
 * - sr-Latn-RS
 * - th-TH
 * - tr-TR
 * - vi-VN
 * - zh-TW
 */
import * as f_ar_SA from 'd3-format/locale/ar-SA.json';
import * as f_ca_ES from 'd3-format/locale/ca-ES.json';
import * as f_cs_CZ from 'd3-format/locale/cs-CZ.json';
import * as f_de_DE from 'd3-format/locale/de-DE.json';
import * as f_es_ES from 'd3-format/locale/es-ES.json';
import * as f_en_US from 'd3-format/locale/en-US.json';
import * as f_fi_FI from 'd3-format/locale/fi-FI.json';
import * as f_fr_FR from 'd3-format/locale/fr-FR.json';
import * as f_he_IL from 'd3-format/locale/he-IL.json';
import * as f_hu_HU from 'd3-format/locale/hu-HU.json';
import * as f_it_IT from 'd3-format/locale/it-IT.json';
import * as f_ja_JP from 'd3-format/locale/ja-JP.json';
import * as f_ko_KR from 'd3-format/locale/ko-KR.json';
import * as f_nl_NL from 'd3-format/locale/nl-NL.json';
import * as f_pl_PL from 'd3-format/locale/pl-PL.json';
import * as f_pt_BR from 'd3-format/locale/pt-BR.json';
import * as f_ru_RU from 'd3-format/locale/ru-RU.json';
import * as f_sv_SE from 'd3-format/locale/sv-SE.json';
import * as f_uk_UA from 'd3-format/locale/uk-UA.json';
import * as f_zh_CN from 'd3-format/locale/zh-CN.json';

/**
 * All `d3-time-format` locales that we ideally need to support Power BI.
 *
 * [DEBT] We will need to create (or assign) the following to support all Power BI locales:
 *
 * - ar-SA
 * - bg-BG
 * - el-GR
 * - et-EE
 * - eU-ES
 * - gl-ES
 * - hi-IN
 * - hr-HR
 * - id-ID
 * - kk-KZ
 * - lt-LT
 * - lv-LV
 * - ms-MY
 * - pt-PT
 * - ro-RO
 * - sk-SK
 * - sl-SI
 * - sr-Cyrl-RS
 * - sr-Latn-RS
 * - th-TH
 * - vi-VN
 */
import * as t_da_DK from 'd3-time-format/locale/da-DK.json';
import * as t_ca_ES from 'd3-time-format/locale/ca-ES.json';
import * as t_cs_CZ from 'd3-time-format/locale/cs-CZ.json';
import * as t_de_DE from 'd3-time-format/locale/de-DE.json';
import * as t_es_ES from 'd3-time-format/locale/es-ES.json';
import * as t_en_US from 'd3-time-format/locale/en-US.json';
import * as t_fi_FI from 'd3-time-format/locale/fi-FI.json';
import * as t_fr_FR from 'd3-time-format/locale/fr-FR.json';
import * as t_he_IL from 'd3-time-format/locale/he-IL.json';
import * as t_hu_HU from 'd3-time-format/locale/hu-HU.json';
import * as t_it_IT from 'd3-time-format/locale/it-IT.json';
import * as t_ja_JP from 'd3-time-format/locale/ja-JP.json';
import * as t_ko_KR from 'd3-time-format/locale/ko-KR.json';
import * as t_nb_NO from 'd3-time-format/locale/nb-NO.json';
import * as t_nl_NL from 'd3-time-format/locale/nl-NL.json';
import * as t_pl_PL from 'd3-time-format/locale/pl-PL.json';
import * as t_pt_BR from 'd3-time-format/locale/pt-BR.json';
import * as t_ru_RU from 'd3-time-format/locale/ru-RU.json';
import * as t_sv_SE from 'd3-time-format/locale/sv-SE.json';
import * as t_tr_TR from 'd3-time-format/locale/tr-TR.json';
import * as t_uk_UA from 'd3-time-format/locale/uk-UA.json';
import * as t_zh_CN from 'd3-time-format/locale/zh-CN.json';
import * as t_zh_TW from 'd3-time-format/locale/zh-TW.json';

import { ILocaleConfiguration } from '../types';

const locales: ILocaleConfiguration = {
    default: 'en-US',
    format: {
        'ar-SA': f_ar_SA,
        'ca-ES': f_ca_ES,
        'cs-CZ': f_cs_CZ,
        'de-DE': f_de_DE,
        'en-NZ': f_en_US,
        'en-US': f_en_US,
        'es-ES': f_es_ES,
        'fi-FI': f_fi_FI,
        'fr-FR': f_fr_FR,
        'he-IL': f_he_IL,
        'hu-HU': f_hu_HU,
        'it-IT': f_it_IT,
        'ja-JP': f_ja_JP,
        'ko-KR': f_ko_KR,
        'nl-NL': f_nl_NL,
        'pl-PL': f_pl_PL,
        'pt-BR': f_pt_BR,
        'ru-RU': f_ru_RU,
        'sv-SE': f_sv_SE,
        'uk-UA': f_uk_UA,
        'zh-CN': f_zh_CN
    },
    timeFormat: {
        'ca-ES': t_ca_ES,
        'cs-CZ': t_cs_CZ,
        'da-DK': t_da_DK,
        'de-DE': t_de_DE,
        'en-NZ': t_en_US,
        'en-US': t_en_US,
        'es-ES': t_es_ES,
        'fi-FI': t_fi_FI,
        'fr-FR': t_fr_FR,
        'he-IL': t_he_IL,
        'hu-HU': t_hu_HU,
        'it-IT': t_it_IT,
        'ja-JP': t_ja_JP,
        'ko-KR': t_ko_KR,
        'nb-NO': t_nb_NO,
        'nl-NL': t_nl_NL,
        'pl-PL': t_pl_PL,
        'pt-BR': t_pt_BR,
        'ru-RU': t_ru_RU,
        'sv-SE': t_sv_SE,
        'tr-TR': t_tr_TR,
        'uk-UA': t_uk_UA,
        'zh-CN': t_zh_CN,
        'zh-TW': t_zh_TW
    }
};
