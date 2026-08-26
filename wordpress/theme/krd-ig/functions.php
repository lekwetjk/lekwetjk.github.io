<?php
if (!defined('ABSPATH')) { exit; }

function krd_ig_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
    register_nav_menus(array('primary' => __('Menu główne', 'krd-ig')));
}
add_action('after_setup_theme', 'krd_ig_setup');

function krd_ig_assets() {
    wp_enqueue_style('krd-ig-style', get_stylesheet_uri(), array(), '1.1.0');
}
add_action('wp_enqueue_scripts', 'krd_ig_assets');

function krd_ig_register_content_types() {
    register_post_type('aktualnosc', array('labels' => array('name' => 'Aktualności', 'singular_name' => 'Aktualność'), 'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'aktualnosci'), 'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions')));
    register_post_type('baza_wiedzy', array('labels' => array('name' => 'Baza wiedzy', 'singular_name' => 'Materiał wiedzy'), 'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'baza-wiedzy'), 'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions')));
    register_post_type('zapytanie_ofertowe', array('labels' => array('name' => 'Zapytania ofertowe', 'singular_name' => 'Zapytanie ofertowe'), 'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'zapytania-ofertowe'), 'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions')));
}
add_action('init', 'krd_ig_register_content_types');

function krd_ig_clean_content($content) {
    $content = preg_replace('/\[\/?et_pb_[^\]]*\]/i', '', (string) $content);
    $content = preg_replace('/\s(?:style|class|id|data-[a-z0-9_-]+)=("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $content);
    return wp_kses_post($content);
}

function krd_ig_render_content($content) {
    echo apply_filters('the_content', krd_ig_clean_content($content));
}