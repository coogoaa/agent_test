https://www.solarquotes.com.au/js/calc/tooltip.js?1753358776

$(window).on('click scroll resize', function(){
	$('.tooltip').remove();
});

$('[data-tooltip]').on('click', function(e) {
	e.preventDefault();
	e.stopPropagation();
	$('.tooltip').remove();

	var msg = $(this).data('tooltip');
	var pos = $(this).offset();
	var elementCenter = pos.left + ($(this).outerWidth() / 2);

	var tooltip = $('<div class="tooltip"><div class="triangle-outline"></div><span class="helper-icon">?</span></div>');
	// Escape message before adding it to the tooltip. Limits the tooltip to simple text.
	tooltip.append(document.createTextNode(msg));
	$('body').prepend(tooltip);

	var scrollTop = $(window).scrollTop();
	var top = pos.top + $(this).outerHeight();
  
	tooltip.css({
		top: (top + 8) + 'px',
		left: elementCenter - (tooltip.outerWidth() / 2) + 'px'
	});
  
    // Mobile: arrow placement
	if ($(window).width() < 768) {
		tooltip.css({
			left: 0,
			right: 0
		});

		var arrowLeft = elementCenter;
		tooltip.css('--arrow-left', arrowLeft + 'px');
	}
});


