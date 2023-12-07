from datetime import datetime


no_str = '一二三四五六日'
def datetime_to_obj(dt: datetime, type = ''):
	yearOfWeek, week, weekday = dt.isocalendar()
	quarter = int((dt.month + 2) / 3)
	textOfDate = dt.strftime('%Y-%m-%d')
	textOfMonth = dt.strftime('%Y年%m月')
	textOfYear = dt.strftime('%Y年')
	textOfWeek = str(yearOfWeek) + '年第' + str(week) + '周'
	textOfWeekday = textOfWeek + '星期' + no_str[weekday - 1]
	textOfQuarter = dt.strftime('%Y') + '年第' + no_str[quarter - 1] + '季度'
	text = textOfDate

	idOfDate = dt.strftime('%Y-%m-%d')
	idOfMonth = dt.strftime('%Y-%m')
	idOfYear = dt.strftime('%Y')
	idOfWeek = str(yearOfWeek) + 'W' + (str(week) if week > 9 else '0' + str(week))
	idOfWeekday = textOfWeek + '-' + str(weekday)
	idOfQuarter = dt.strftime('%Y') + 'Q' + str(quarter);
	text = textOfDate
	id = idOfDate
	if isinstance(type, str): type = type.lower()
	if type == 'month':
		text = textOfMonth
		id = idOfMonth
	elif type == 'year':
		text = textOfYear
		id = idOfYear
	elif type == 'week':
		text = textOfWeek
		id = idOfWeek
	elif type == 'quarter':
		text = textOfQuarter
		id = idOfQuarter
	elif type == 'weekday':
		text = textOfWeekday
		id = idOfWeekday

	return dict(
		text=text,
		textOfDate=textOfDate,
		textOfMonth=textOfMonth,
		textOfYear=textOfYear,
		textOfWeek=textOfWeek,
		textOfWeekday=textOfWeekday,
		textOfQuarter=textOfQuarter,

		id=id,
		idOfDate=idOfDate,
		idOfMonth=idOfMonth,
		idOfYear=idOfYear,
		idOfWeek=idOfWeek,
		idOfWeekday=idOfWeekday,
		idOfQuarter=idOfQuarter,

		year=dt.year,
		quarter=quarter,
		month=dt.month,
		day=dt.day,
		hour=dt.hour,
		minute=dt.minute,
		second=dt.second,
		microsecond=dt.microsecond,
		yearOfWeek=yearOfWeek,
		week=week,
		weekday=weekday,
	)
