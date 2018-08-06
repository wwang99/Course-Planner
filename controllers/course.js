const Course = require('../models/Course.js');
const Comment = require('../models/Comment.js');
const knexfile = require('../knexfile.js');
const knex = require('knex')(knexfile);

const handleCoursePost = async (req, res, next) => {
    let data = {
        notification: null,
        user: null
    };
    if (req.session.notification) {
        data.notification = req.session.notification;
        req.session.notification = null;
    }
    if (req.session.user) {
        data.user = req.session.user;
    }
    if (req.session.user) { // logged in
        const { comment_text: commentText, rating, date, course, user } = req.body;

        // check if user has commented/rated before
        try {
            const comment = await Comment.query().where('user', user);
            if (comment == null) {
                knex('comments').where('user', req.session.user).update({ comment_text: commentText, rating: rating, date: date });
                res.redirect('/course?id=' + course);
            } else {
                knex('comments').insert({ comment_text: commentText, rating: rating, date: date, course: course, user: user });
                res.redirect('/course?id=' + course);
            }
        } catch (error) {
            console.log(error);
            req.session.notification = {
                type: 'error',
                message: 'There was a problem on our end :('
            };
            res.redirect('/error');
        }

    } else { // not logged in
        console.log('non-logged in user tried to rate/comment');
        req.session.notification = {
            type: 'error',
            message: 'Please login or register to rate and comment on courses.'
        };
        res.redirect('/course?id=' + course);
    }
}

const handleCourseGet = async (req, res, next) => {
    let data = {
        notification: null,
        user: null
    };
    if (req.session.notification) {
        data.notification = req.session.notification;
        req.session.notification = null;
    }
    if (req.session.user) {
        data.user = req.session.user;
    }
    const courseId = req.query.id;
    try {
        // course information
        const selectedCourse = await Course.query().where('course_full_number', courseId);
        if (selectedCourse === undefined || selectedCourse.length === 0) {
            console.log('user tried to access course that does not exist in db');
            req.session.notification = {
                type: 'error',
                message: 'Hmm, this course doesnt seem to exist.'
            };
            res.status(404).redirect('/error');
        } else {
            const firstSection = selectedCourse[0];
            // destructuring
            const {
                name,
                course_full_number: courseFullNumber,
                core_codes: coreCodes,
                credits,
                pre_reqs: preReqs,
                times,
                url
            } = firstSection;

            // formats the core codes
            let coreCodesString = '';
            if (Object.keys(coreCodes).length === 0 && coreCodes.constructor === Object) {
                coreCodesString = 'None';
            } else {
                coreCodes.forEach(function(element) {
                    coreCodesString += element.code + ', ';
                });
                coreCodesString = coreCodesString.substring(0, coreCodesString.length - 2);
            }

            // formats descriptions
            let description = url;
            if (description == null) {
                description = 'Coming Soon';
            }

            // formats course rating
            const courseRating = await knex('comments').avg('rating').where('course', courseFullNumber).then(result => {
                return (Math.round(result[0].avg * 2) / 2).toFixed(1);
            });
            data.name = name;
            data.courseFullNumber = courseFullNumber;
            data.coreCodesString = coreCodesString;
            data.credits = credits;
            data.preReqs = preReqs;
            data.description = description;
            data.courseRating = courseRating;

            // section information
            /* section object will contain the following properties:
               *   section_number
               *   section_index
               *   day_time: day and am/pm time
               *   location: campus and room
               *   instructors
               *   meeting_mode
               *   notes
            */
            /*
               *   meeting mode code:
               *   90 -> ONLINE INSTRUCTION(INTERNET)
               *   02 -> LEC
               *   03 -> RECIT
               *   04 -> SEM
               *   19 -> PROJ-IND
            */
            console.log('SECTION DEBUGGING INFO ----------------------------------');
            console.log('Amount of sections: ' + selectedCourse.length);
            let sections = [];
            for (let i = 0; i < selectedCourse.length; i++) {
                let sectionNumber = selectedCourse[i].section_number;
                let sectionIndex = selectedCourse[i].section_index;
                let notes = selectedCourse[i].notes;
                let sectionOpenStatus = selectedCourse[i].section_open_status;
                let examCode = selectedCourse[i].exam_code;

                let instructors = selectedCourse[i].instructors;
                if (instructors == null) {
                    instructors = 'None';
                } else {
                    instructors = formatInstructors(instructors);
                }

                let sectionTimes = selectedCourse[i].times;

                let dayTimes = [];
                let locations = [];
                let meetingCodes = [];
                let meetingModeDescs = [];

                console.log('Amount of classes for section' + i + ': ' + sectionTimes.length);
                for (let j = 0; j < sectionTimes.length; j++) {

                    // meeting mode
                    let meetingCode = sectionTimes[j].meetingModeCode;
                    let meetingModeDesc = sectionTimes[j].meetingModeDesc;

                    // time and location
                    let dayTime = formatTimeDay(sectionTimes[j], meetingCode);
                    let location = formatLocation(sectionTimes[j], meetingCode);

                    dayTimes.push(dayTime);
                    locations.push(location);
                    meetingCodes.push(meetingCode);
                    meetingModeDescs.push(meetingModeDesc);
                }


                let section = {
                    sectionNumber: sectionNumber,
                    sectionIndex: sectionIndex,
                    notes: notes,
                    dayTimes: dayTimes, // is array
                    locations: locations, // is array
                    instructors: instructors,
                    meetingCodes: meetingCodes, // is array
                    meetingModeDescs: meetingModeDescs, // is array
                    sectionOpenStatus: sectionOpenStatus,
                    examCode: examCode
                }
                console.log('section' + i);
                console.log(section);
                sections.push(section);
            }
            data.sections = sections;

            let courseOpenStatus = 'CLOSED';
            for(let s of sections) {
                if (s.sectionOpenStatus === 'OPEN') {
                    courseOpenStatus = 'OPEN';
                    break;
                }
            }
            data.courseOpenStatus = courseOpenStatus;

            console.log('-------------------------------------------------')

            console.log('CLASS DEBUGGING INFO ----------------------------------')
            console.log('name: ' + name);
            console.log('courseFullNumber: ' + courseFullNumber);
            console.log('coreCodesString: ' + coreCodesString);
            console.log('credits: ' + credits);
            console.log('preReqs: ' + preReqs);
            console.log('description: ' + data.description);
            console.log('times: ' + times);
            console.log('courseOpenStatus: ' + courseOpenStatus);
            console.log('courseRating: ' + courseRating);
            console.log('sections:');
            console.log(sections);
            console.log('-------------------------------------------------')

            // handle comments
            const comments = await Comment.query().where('course', courseId).orderBy('date', 'asc');

            data.comments = comments;

            console.log('COMMENT DEBUGGING INFO ----------------------------------')
            console.log(comments);
            console.log('-------------------------------------------------')

            res.render('pages/course', data);
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json('Error retrieving course data');
    }
}

const formatDay = (day) => {
    switch (day) {
        case 'M':
            return 'Mon';
            break;
        case 'T':
            return 'Tue';
            break;
        case 'W':
            return 'Wed';
            break;
        case 'TH':
            return 'Thu';
            break;
        case 'F':
            return 'Fri';
            break;
        case 'S':
            return 'Sat';
            break;
        default:
            console.log('day passed: ' + day);
            return 'N/A';
    }
}

/*
 *   since there are no classes at midnight we can assume that
 *   any time where there is a pm code of P and the start timeout
 *   is greater than the end time, that the class goes from AM to PM
 *   or if the end time takes place from 12:00 - 12:59 because classes
 *   are always longer than 59 minutes
 */
const formatTime = (times, meeting_code) => {
    // check for meeting type
    if (meeting_code === '90') {
        return 'Online';
    } else if (meeting_code === '19') {
        return 'Independent Project';
    } else {
        // fall back incase time passed is null
        let time;
        if (times.startTime == null || times.endTime == null) {
            return 'N/A';
        } else {
            let start_time = times.startTime;
            let end_time = times.endTime;
            let pm_code = times.pmCode;
            if (parseInt(start_time) > parseInt(end_time) || (parseInt(end_time) >= 1200 && parseInt(end_time) <= 1259)) {
                return (stripLeadingZero(start_time) + "AM - " + stripLeadingZero(end_time) + "PM");
            } else {
                return (stripLeadingZero(start_time) + pm_code + "M - " + stripLeadingZero(end_time) + pm_code + "M");
            }
        }
    }
}

const stripLeadingZero = (str) => {
    if (str === '') {
        return '';
    } else {
        str = addColon(str);
        if (str.indexOf(0) == '0') {
            return str.slice(1);
        } else {
            return str;
        }
    }
}

const addColon = (str) => {
    return str.slice(0, 2) + ":" + str.slice(2, 4);
}
// formatTimeDay('11:00', '12:00', 'P');

const formatTimeDay = (times, meeting_code) => {
    if (meeting_code === '90' || meeting_code === '19') {
        return formatTime(times, meeting_code);
    }
    return formatDay(times.meetingDay) + " " +  formatTime(times, meeting_code);
}

const formatLocation = (times, meeting_code) => {
    if (meeting_code === '90') {
        return 'Online';
    } else if (meeting_code === '19') {
        return 'Independent Project';
    } else {
        // make sure there is a fall back in case any location properties are null
        let campus_abbrev = times.campusAbbrev;
        let building_code = times.buildingCode;
        let room_number = times.roomNumber;
        if (campus_abbrev == null) {
            campus_abbrev = 'N/A';
        }
        if (building_code == null) {
            building_code = 'N/A';
        }
        if (room_number == null) {
            room_number = 'N/A';
        }
        return campus_abbrev + "-" + building_code + "-" + room_number;
    }
}

const formatInstructors = (instructors) => {
    return instructors.replace(/ and /, '<br>');
}
module.exports = {
    handleCourseGet: handleCourseGet,
    handleCoursePost: handleCoursePost
}
