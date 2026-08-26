<?php get_header(); ?><main class="site-main"><div class="post-list">
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
<article class="post-card"><div class="entry-header"><p class="entry-meta"><?php echo esc_html(get_the_date()); ?></p><h1 class="entry-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h1></div><div class="entry-summary"><?php the_excerpt(); ?></div></article>
<?php endwhile; else : ?><p>Nie znaleziono treści.</p><?php endif; ?></div></main><?php get_footer();