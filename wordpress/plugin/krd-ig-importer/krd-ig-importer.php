<?php
/**
 * Plugin Name: KRD-IG Importer
 * Description: Importuje eksport content-export.json do motywu KRD-IG.
 * Version: 1.0.0
 * Requires at least: 6.4
 * Requires PHP: 8.0
 */
if (!defined('ABSPATH')) { exit; }

function krd_ig_importer_types() {
    $types = array(
        'aktualnosc' => array('Aktualności', 'Aktualność', 'aktualnosci'),
        'baza_wiedzy' => array('Baza wiedzy', 'Materiał wiedzy', 'baza-wiedzy'),
        'zapytanie_ofertowe' => array('Zapytania ofertowe', 'Zapytanie ofertowe', 'zapytania-ofertowe'),
    );
    foreach ($types as $type => $values) {
        register_post_type($type, array(
            'labels' => array('name' => $values[0], 'singular_name' => $values[1]),
            'public' => true, 'show_in_rest' => true, 'has_archive' => true,
            'rewrite' => array('slug' => $values[2]),
            'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions'),
        ));
    }
}
add_action('init', 'krd_ig_importer_types');

function krd_ig_importer_menu() {
    add_management_page('Import KRD-IG', 'Import KRD-IG', 'manage_options', 'krd-ig-importer', 'krd_ig_importer_page');
}
add_action('admin_menu', 'krd_ig_importer_menu');

function krd_ig_importer_clean_html($content) {
    $content = preg_replace('/\[\/?et_pb_[^\]]*\]/i', '', (string) $content);
    $content = preg_replace('/\s(?:style|class|id|data-[a-z0-9_-]+)=("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $content);
    return wp_kses_post($content);
}

function krd_ig_importer_page() {
    if (!current_user_can('manage_options')) { return; }
    echo '<div class="wrap"><h1>Import KRD-IG</h1><p>Wybierz plik <code>content-export.json</code>. Import aktualizuje istniejące wpisy po slugu.</p>';
    if (!empty($_POST['krd_ig_import']) && check_admin_referer('krd_ig_import_action', 'krd_ig_nonce')) {
        krd_ig_run_import();
    }
    echo '<form method="post" enctype="multipart/form-data"><input type="file" name="krd_ig_json" accept="application/json,.json" required> ';
    wp_nonce_field('krd_ig_import_action', 'krd_ig_nonce');
    submit_button('Importuj dane', 'primary', 'krd_ig_import');
    echo '</form></div>';
}

function krd_ig_run_import() {
    if (empty($_FILES['krd_ig_json']['tmp_name']) || $_FILES['krd_ig_json']['error'] !== UPLOAD_ERR_OK) { echo '<div class="notice notice-error"><p>Nie udało się przesłać pliku.</p></div>'; return; }
    $json = file_get_contents($_FILES['krd_ig_json']['tmp_name']);
    $data = json_decode($json, true);
    if (!is_array($data) || ($data['format'] ?? '') !== 'krd-ig-wordpress-v1') { echo '<div class="notice notice-error"><p>Nieprawidłowy format eksportu.</p></div>'; return; }
    $created = 0; $updated = 0; $errors = 0; $media = 0;
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $source_base = untrailingslashit(esc_url_raw($data['source'] ?? ''));
    foreach (array_merge($data['pages'] ?? array(), $data['posts'] ?? array()) as $item) {
        $type = sanitize_key($item['postType'] ?? '');
        if (!in_array($type, array('aktualnosc', 'baza_wiedzy', 'zapytanie_ofertowe'), true)) { $errors++; continue; }
        $slug = sanitize_title($item['slug'] ?? $item['title'] ?? '');
        $existing = get_page_by_path($slug, OBJECT, $type);
        $content = krd_ig_importer_clean_html($item['contentHtml'] ?? '');
        foreach ($item['links'] ?? array() as $link) {
            $href = esc_url($link['href'] ?? '');
            $label = esc_html($link['label'] ?? $href);
            if ($href) { $content .= '<p><a href="' . $href . '" target="_blank" rel="noopener noreferrer">' . $label . '</a></p>'; }
        }
        $post = array('post_type' => $type, 'post_status' => 'publish', 'post_title' => wp_strip_all_tags($item['title'] ?? ''), 'post_name' => $slug, 'post_content' => $content, 'post_excerpt' => sanitize_textarea_field($item['excerpt'] ?? ''));
        if (!empty($item['date'])) { $post['post_date'] = sanitize_text_field($item['date']); }
        if ($existing) { $post['ID'] = $existing->ID; $result = wp_update_post(wp_slash($post), true); $updated++; } else { $result = wp_insert_post(wp_slash($post), true); $created++; }
        if (is_wp_error($result)) { $errors++; continue; }
        if ($type === 'baza_wiedzy') {
            $legacy_page = get_page_by_path($slug, OBJECT, 'page');
            if ($legacy_page && (strpos($legacy_page->post_content, '[et_pb_') !== false || trim(wp_strip_all_tags($legacy_page->post_content)) === '')) {
                wp_update_post(wp_slash(array('ID' => $legacy_page->ID, 'post_content' => $content, 'post_excerpt' => sanitize_textarea_field($item['excerpt'] ?? ''))));
            }
        }
        update_post_meta($result, '_krd_ig_source_id', absint($item['sourceId'] ?? 0));
        update_post_meta($result, '_krd_ig_source_url', esc_url_raw($item['sourceUrl'] ?? ''));
        update_post_meta($result, '_krd_ig_links', $item['links'] ?? array());
        update_post_meta($result, '_krd_ig_image', sanitize_text_field($item['image'] ?? ($item['images'][0] ?? '')));
        $image_path = $item['image'] ?? (($item['images'] ?? array())[0] ?? '');
        if ($image_path && !has_post_thumbnail($result)) {
            $image_url = preg_match('/^https?:\/\//i', $image_path) ? $image_path : $source_base . '/' . ltrim($image_path, '/');
            $attachment_id = media_sideload_image(esc_url_raw($image_url), $result, wp_strip_all_tags($item['title'] ?? ''), 'id');
            if (!is_wp_error($attachment_id)) {
                set_post_thumbnail($result, $attachment_id);
                $image_html = '<p><img src="' . esc_url(wp_get_attachment_url($attachment_id)) . '" alt="' . esc_attr($item['title'] ?? '') . '"></p>';
                wp_update_post(wp_slash(array('ID' => $result, 'post_content' => $image_html . $content)));
                $media++;
            }
        } elseif (has_post_thumbnail($result) && strpos((string) get_post_field('post_content', $result), '<img') === false) {
            $image_url = wp_get_attachment_url(get_post_thumbnail_id($result));
            if ($image_url) { wp_update_post(wp_slash(array('ID' => $result, 'post_content' => '<p><img src="' . esc_url($image_url) . '" alt="' . esc_attr($item['title'] ?? '') . '"></p>' . $content))); }
        }
        foreach ($item['categories'] ?? array() as $category) {
            $category_name = sanitize_text_field($category);
            $category_id = term_exists($category_name, 'category');
            if (!$category_id) { $category_id = wp_insert_term($category_name, 'category'); }
            if (is_array($category_id) && !empty($category_id['term_id'])) { $category_id = $category_id['term_id']; }
            if (is_numeric($category_id)) { wp_set_post_categories($result, array_merge(wp_get_post_categories($result), array((int) $category_id))); }
        }
    }
    flush_rewrite_rules(false);
    printf('<div class="notice notice-success"><p>Import zakończony. Utworzono: %d, zaktualizowano: %d, obrazów: %d, błędów: %d.</p></div>', $created, $updated, $media, $errors);
}